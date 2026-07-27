import { createBase44Repository } from '@/shared/api/base44Repository';
const services = createBase44Repository('Service');
const notes = createBase44Repository('ServiceNote');
export const serviceRepository = {
  listForSalon(salonId, limit = 200) { return services.list({ salon_id: salonId }, '-created_date', limit); },
  create(payload) { return services.create(payload); },
  update(id, patch) { return services.update(id, patch); },
  subscribe(handler) { return services.subscribe(handler); },
  listNotes(salonId, limit = 200) { return notes.list({ salon_id: salonId }, '-created_date', limit); },
  createNote(payload) { return notes.create(payload); },
  subscribeNotes(handler) { return notes.subscribe(handler); },
};
