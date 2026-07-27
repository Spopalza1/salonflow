import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const allowedSources = new Set(['service', 'service_note', 'guest_message']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { source_type, source_id, event_type = 'created' } = await req.json();
    if (!allowedSources.has(source_type) || !source_id) {
      return Response.json({ error: 'Unsupported source notification request' }, { status: 400 });
    }

    let source: any;
    let salonId: string;
    let title = 'SalonFlow update';
    let body = 'New activity requires your attention.';
    let type = 'general_alert';
    let targetTab = 'notifications';
    let targetParameters: Record<string, unknown> = {};
    let groupKey = `${source_type}:${source_id}`;
    let senderUserId: string | undefined;

    if (source_type === 'service') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      source = await base44.asServiceRole.entities.Service.get(source_id);
      if (!source || source.salon_id !== user.salon_id || source.stylist_id !== user.id) {
        return Response.json({ error: 'Service not found or access denied' }, { status: 403 });
      }
      salonId = source.salon_id;
      senderUserId = user.id;
      type = event_type === 'completed' ? 'service_update' : 'service_request';
      title = event_type === 'completed' ? `Service completed by ${source.stylist_name}` : `New service started by ${source.stylist_name}`;
      body = `${source.client_name} — ${source.service_name}`;
      targetTab = 'services';
      targetParameters = { service_id: source.id };
      groupKey = `service:${source.id}`;
    } else if (source_type === 'service_note') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      source = await base44.asServiceRole.entities.ServiceNote.get(source_id);
      if (!source || source.salon_id !== user.salon_id || source.author_id !== user.id) {
        return Response.json({ error: 'Service note not found or access denied' }, { status: 403 });
      }
      salonId = source.salon_id;
      senderUserId = user.id;
      type = 'service_update';
      title = `Service update from ${source.author_name}`;
      body = source.content;
      targetTab = 'services';
      targetParameters = { service_id: source.service_id };
      groupKey = `service:${source.service_id}`;
    } else {
      source = await base44.asServiceRole.entities.GuestMessage.get(source_id);
      if (!source) return Response.json({ error: 'Guest message not found' }, { status: 404 });
      salonId = source.salon_id;
      type = 'guest_message';
      title = `Message from ${source.guest_name}`;
      body = source.message;
      targetTab = 'messages';
      targetParameters = { guest_message_id: source.id };
      groupKey = `guest-message:${source.id}`;
    }

    const users = await base44.asServiceRole.entities.User.filter({ salon_id: salonId });
    const recipients = users.filter((u: any) => u.role === 'admin');
    let created = 0;
    for (const recipient of recipients) {
      const key = `${source_type}:${event_type}:${source_id}:${recipient.id}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({
        salon_id: salonId,
        recipient_user_id: recipient.id,
        idempotency_key: key,
      }, '-created_date', 1);
      if (existing.length) continue;
      await base44.asServiceRole.entities.Notification.create({
        salon_id: salonId,
        recipient_user_id: recipient.id,
        sender_user_id: senderUserId,
        type,
        priority: type === 'service_update' ? 'high' : 'normal',
        title,
        body,
        source_id,
        source_type,
        service_id: source_type === 'service' ? source.id : source.service_id,
        target_tab: targetTab,
        target_route: '/front-desk',
        target_parameters: targetParameters,
        group_key: groupKey,
        idempotency_key: key,
        target_role: 'admin',
        read: false,
      });
      created += 1;
    }
    return Response.json({ success: true, created });
  } catch (error) {
    console.error('createOperationalNotifications error', error);
    return Response.json({ error: error.message || 'Unable to create notifications' }, { status: 500 });
  }
});
