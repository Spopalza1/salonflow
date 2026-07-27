export const queryKeys = {
  salon: (salonId) => ['salon', String(salonId)],
  orders: (salonId) => [...queryKeys.salon(salonId), 'orders'],
  services: (salonId) => [...queryKeys.salon(salonId), 'services'],
  menuItems: (salonId) => [...queryKeys.salon(salonId), 'menu-items'],
  menuCategories: (salonId) => [...queryKeys.salon(salonId), 'menu-categories'],
  staff: (salonId) => [...queryKeys.salon(salonId), 'staff'],
  messages: (salonId, userId, mode) => [...queryKeys.salon(salonId), 'messages', mode, String(userId)],
  notifications: (salonId, userId) => [...queryKeys.salon(salonId), 'notifications', String(userId)],
};
