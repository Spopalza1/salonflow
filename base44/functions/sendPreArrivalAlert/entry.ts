import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id, item_name, salon_id, guest_name, arrival_time } = body;

    if (!item_name || !salon_id || !arrival_time) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const arrivalDate = new Date(arrival_time);
    const arrivalStr = arrivalDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    await base44.asServiceRole.entities.Notification.create({
      title: 'Pre-Arrival Order Alert',
      body: `${guest_name || 'Guest'} arrives at ${arrivalStr} — pre-ordered: ${item_name}`,
      type: 'order',
      salon_id,
      source_id: order_id,
      target_role: 'admin',
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to send pre-arrival alert:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});