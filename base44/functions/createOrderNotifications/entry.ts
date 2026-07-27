import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order?.salon_id) return Response.json({ error: 'Order not found' }, { status: 404 });
    const admins = (await base44.asServiceRole.entities.User.filter({ salon_id: order.salon_id })).filter((u:any) => u.role === 'admin');
    const chair = order.chair_table ? ` (${order.chair_table})` : '';
    const title = order.is_pre_order ? 'New Pre-Arrival Order' : 'New Order Received';
    const body = `${order.requested_by_name || 'Guest'} requested ${order.item_name}${chair}`;
    let created = 0;
    for (const admin of admins) {
      const key = `order:${order.id}:${admin.id}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({ salon_id: order.salon_id, recipient_user_id: admin.id, idempotency_key: key }, '-created_date', 1);
      if (existing.length) continue;
      await base44.asServiceRole.entities.Notification.create({
        title, body, type: 'order_created', priority: order.is_pre_order ? 'high' : 'normal',
        salon_id: order.salon_id, recipient_user_id: admin.id,
        source_id: order.id, source_type: 'order', order_id: order.id,
        target_tab: 'orders', target_route: '/front-desk', group_key: `order:${order.id}`,
        idempotency_key: key, target_role: 'admin', read: false,
      });
      created += 1;
    }
    return Response.json({ success: true, created });
  } catch (error) {
    console.error('createOrderNotifications error', error);
    return Response.json({ error: error.message || 'Unable to create order notifications' }, { status: 500 });
  }
});
