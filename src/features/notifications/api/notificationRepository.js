import { createBase44Repository } from '@/shared/api/base44Repository';
const notifications = createBase44Repository('Notification');
export const notificationRepository = {
  listForRecipient(salonId, userId, limit = 200) { return notifications.list({ salon_id: salonId, recipient_user_id: userId }, '-created_date', limit); },
  findByIdempotencyKey(salonId, userId, key) { return notifications.list({ salon_id: salonId, recipient_user_id: userId, idempotency_key: key }, '-created_date', 1); },
  create(payload) { return notifications.create(payload); },
  update(id, patch) { return notifications.update(id, patch); },
  subscribe(handler) { return notifications.subscribe(handler); },
};
