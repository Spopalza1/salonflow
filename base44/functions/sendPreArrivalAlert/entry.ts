import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await base44.auth.isAuthenticated())) return Response.json({ error:'Unauthorized' }, { status:401 });
    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error:'Missing order_id' }, { status:400 });
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order?.is_pre_order || !order.arrival_time) return Response.json({ error:'Order is not a pre-arrival order' }, { status:400 });
    const admins = (await base44.asServiceRole.entities.User.filter({ salon_id:order.salon_id })).filter((u:any) => u.role === 'admin');
    const arrival = new Date(order.arrival_time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    await Promise.all(admins.map((admin:any) => base44.asServiceRole.entities.Notification.create({
      title:'Pre-Arrival Order Alert', body:`${order.requested_by_name || 'Guest'} arrives at ${arrival} — pre-ordered: ${order.item_name}`,
      type:'order_update', priority:'high', salon_id:order.salon_id, recipient_user_id:admin.id,
      source_id:order_id, source_type:'order', order_id, target_tab:'orders', target_route:'/front-desk',
      group_key:`order:${order_id}`, idempotency_key:`pre-arrival-alert:${order_id}:${admin.id}`, read:false, target_role:'admin',
    })));
    return Response.json({ success:true, recipients:admins.length });
  } catch (error) { console.error(error); return Response.json({ error:error.message }, { status:500 }); }
});
