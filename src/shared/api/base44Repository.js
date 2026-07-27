import { base44 } from '@/api/base44Client';

export function createBase44Repository(entityName) {
  const entity = base44.entities[entityName];
  if (!entity) throw new Error(`Unknown Base44 entity: ${entityName}`);
  return {
    list(filter = {}, sort = '-created_date', limit) { return entity.filter(filter, sort, limit); },
    get(id) { return entity.get(id); },
    create(payload) { return entity.create(payload); },
    update(id, patch) { return entity.update(id, patch); },
    remove(id) { return entity.delete(id); },
    removeMany(filter) { return entity.deleteMany(filter); },
    subscribe(handler) { return entity.subscribe(handler); },
  };
}

export function invokeServerFunction(name, payload = {}) {
  return base44.functions.invoke(name, payload);
}
