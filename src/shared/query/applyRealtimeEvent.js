export function applyRealtimeEvent(current = [], event) {
  if (!event) return current;
  if (event.type === 'delete') return current.filter((item) => item.id !== event.id);
  if (!event.data?.id) return current;
  const index = current.findIndex((item) => item.id === event.data.id);
  if (event.type === 'create') return index >= 0 ? current : [...current, event.data];
  if (event.type === 'update') {
    if (index < 0) return [...current, event.data];
    return current.map((item) => item.id === event.data.id ? event.data : item);
  }
  return current;
}
