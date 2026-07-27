import { createBase44Repository } from '@/shared/api/base44Repository';
const items = createBase44Repository('MenuItem');
const categories = createBase44Repository('MenuCategory');
const optionGroups = createBase44Repository('MenuItemOptionGroup');
export const menuRepository = {
  listItems(salonId) { return items.list({ salon_id: salonId }, 'sort_order'); },
  listCategories(salonId) { return categories.list({ salon_id: salonId }, 'sort_order'); },
  listOptionGroups(salonId) { return optionGroups.list({ salon_id: salonId }, 'sort_order'); },
  createItem(payload) { return items.create(payload); },
  updateItem(id, patch) { return items.update(id, patch); },
  removeItem(id) { return items.remove(id); },
  subscribeItems(handler) { return items.subscribe(handler); },
  subscribeCategories(handler) { return categories.subscribe(handler); },
};
