import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const field = (record: any, key: string) => record?.[key] ?? record?.data?.[key];
const roleOf = (record: any) => String(field(record, 'role') || '').toLowerCase();
const salonOf = (record: any) => String(field(record, 'salon_id') || '');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message_id } = await req.json();
    if (!message_id) return Response.json({ error: 'message_id is required' }, { status: 400 });

    const message = await base44.asServiceRole.entities.Message.get(message_id);
    const userSalonId = salonOf(user);
    const messageSalonId = String(field(message, 'salon_id') || '');
    const senderId = String(field(message, 'sender_id') || '');
    if (!message || senderId !== String(user.id) || !messageSalonId || messageSalonId !== userSalonId) {
      return Response.json({ error: 'Message not found or not owned by sender' }, { status: 403 });
    }

    // Use service-role lookup so notification delivery does not depend on the
    // sender being allowed to read the recipient's private User record.
    const allUsers = await base44.asServiceRole.entities.User.filter({ salon_id: messageSalonId });
    const usersInSalon = (allUsers || []).filter((candidate: any) => salonOf(candidate) === messageSalonId);
    const senderRole = String(field(message, 'sender_role') || roleOf(user)).toLowerCase();
    const partnerId = String(field(message, 'thread_partner_id') || '');

    const recipients = senderRole === 'admin'
      ? usersInSalon.filter((candidate: any) => String(candidate.id) === partnerId)
      : usersInSalon.filter((candidate: any) => roleOf(candidate) === 'admin');

    if (!recipients.length) {
      console.warn('createMessageNotifications: no recipient found', {
        message_id,
        sender_role: senderRole,
        thread_partner_id: partnerId,
        salon_id: messageSalonId,
      });
      return Response.json({ success: false, created: 0, error: 'No notification recipient found' }, { status: 404 });
    }

    const isService = field(message, 'message_type') === 'service_update';
    const senderName = field(message, 'sender_name') || 'team member';
    const title = isService ? `Service Update From ${senderName}` : `New Message From ${senderName}`;
    const body = field(message, 'body') || `Sent a ${field(message, 'media_type') || 'message'}`;
    let created = 0;

    for (const recipient of recipients) {
      if (String(recipient.id) === senderId) continue;
      const recipientRole = roleOf(recipient) || 'user';
      const key = `message:${message.id}:${recipient.id}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({
        salon_id: messageSalonId,
        recipient_user_id: recipient.id,
        idempotency_key: key,
      }, '-created_date', 1);
      if (existing?.length) continue;

      await base44.asServiceRole.entities.Notification.create({
        title,
        body,
        type: isService ? 'service_update' : 'chat_message',
        priority: isService ? 'high' : 'normal',
        salon_id: messageSalonId,
        recipient_user_id: recipient.id,
        sender_user_id: senderId,
        source_id: message.id,
        source_type: 'message',
        conversation_id: partnerId,
        message_id: message.id,
        target_tab: isService && recipientRole !== 'admin' ? 'service-update' : 'chat',
        target_route: recipientRole === 'admin' ? '/front-desk' : '/stylist',
        target_parameters: { partner_id: partnerId },
        group_key: `conversation:${partnerId}`,
        idempotency_key: key,
        target_role: recipientRole === 'admin' ? 'admin' : (recipientRole === 'stylist' ? 'stylist' : 'user'),
        read: false,
      });
      created += 1;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    console.error('createMessageNotifications error', error);
    return Response.json({ error: error.message || 'Unable to create message notifications' }, { status: 500 });
  }
});
