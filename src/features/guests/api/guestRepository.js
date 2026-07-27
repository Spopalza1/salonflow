import { createBase44Repository, invokeServerFunction } from '@/shared/api/base44Repository';
const messages = createBase44Repository('GuestMessage');
export const guestRepository = {
  listMessages(salonId, limit = 100) { return messages.list({ salon_id: salonId }, '-created_date', limit); },
  createMessage(payload) { return messages.create(payload); },
  subscribeMessages(handler) { return messages.subscribe(handler); },
  getMenu(payload) { return invokeServerFunction('getGuestMenu', payload); },
  getCustomization(payload) { return invokeServerFunction('getGuestCustomization', payload); },
  getOrders(payload) { return invokeServerFunction('getGuestOrders', payload); },
  createPreArrivalOrder(payload) { return invokeServerFunction('createPreArrivalOrder', payload); },
};
