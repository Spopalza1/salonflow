import { createBase44Repository, invokeServerFunction } from '@/shared/api/base44Repository';
const orders = createBase44Repository('Order');
export const orderRepository = {
  listForSalon(salonId, limit = 200) { return orders.list({ salon_id: salonId }, '-created_date', limit); },
  create(payload) { return orders.create(payload); },
  update(id, patch) { return orders.update(id, patch); },
  remove(id) { return orders.remove(id); },
  subscribe(handler) { return orders.subscribe(handler); },
  notify(orderId, eventType) { return invokeServerFunction('createOrderNotifications', { order_id: orderId, event_type: eventType }); },
};
