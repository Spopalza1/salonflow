import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderRepository } from '../api/orderRepository';
import { queryKeys } from '@/shared/query/queryKeys';
import { useRealtimeQuery } from '@/shared/query/useRealtimeQuery';
export function useOrders(salonId) {
  const key = queryKeys.orders(salonId);
  const query = useQuery({ queryKey: key, enabled: Boolean(salonId), queryFn: () => orderRepository.listForSalon(salonId) });
  const subscribe = useCallback((handler) => orderRepository.subscribe(handler), []);
  const accept = useCallback((event) => !event.data || String(event.data.salon_id) === String(salonId), [salonId]);
  useRealtimeQuery(key, subscribe, accept);
  return query;
}
