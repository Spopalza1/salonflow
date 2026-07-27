import { createBase44Repository, invokeServerFunction } from '@/shared/api/base44Repository';
const users = createBase44Repository('User');
export const staffRepository = {
  listForSalon(salonId) { return users.list({ salon_id: salonId }, 'full_name'); },
  listStylists() { return invokeServerFunction('getSalonStylists', {}); },
  invite(payload) { return invokeServerFunction('inviteStylist', payload); },
  update(id, patch) { return users.update(id, patch); },
  subscribe(handler) { return users.subscribe(handler); },
};
