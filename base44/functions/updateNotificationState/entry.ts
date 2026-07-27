import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (request) => {
  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { notification_id, action } = await request.json();
    if (!notification_id || !['read', 'opened', 'dismissed'].includes(action)) {
      return Response.json({ error: 'Invalid notification transition' }, { status: 400 });
    }
    const rows = await base44.entities.Notification.filter({ id: notification_id, recipient_user_id: user.id }, '-created_date', 1);
    const notification = rows?.[0];
    if (!notification || String(notification.salon_id) !== String(user.salon_id)) {
      return Response.json({ error: 'Notification not found' }, { status: 404 });
    }
    const now = new Date().toISOString();
    const patch = action === 'read'
      ? { read: true, read_at: notification.read_at || now }
      : action === 'opened'
        ? { read: true, read_at: notification.read_at || now, opened_at: notification.opened_at || now }
        : { read: true, read_at: notification.read_at || now, dismissed_at: now };
    const updated = await base44.asServiceRole.entities.Notification.update(notification.id, patch);
    return Response.json({ notification: updated });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unable to update notification' }, { status: 500 });
  }
});
