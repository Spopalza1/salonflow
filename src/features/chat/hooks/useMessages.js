import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatRepository } from '../api/chatRepository';
import { queryKeys } from '@/shared/query/queryKeys';
import { useRealtimeQuery } from '@/shared/query/useRealtimeQuery';

export function useMessages({ salonId, userId, mode }) {
  const key = queryKeys.messages(salonId, userId, mode);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId && (mode === 'stylist' || salonId)),
    queryFn: () => mode === 'stylist' ? chatRepository.listForStylist(userId) : chatRepository.listForSalon(salonId),
  });
  const subscribe = useCallback((handler) => chatRepository.subscribe(handler), []);
  const accept = useCallback((event) => !event.data || String(event.data.salon_id) === String(salonId), [salonId]);
  useRealtimeQuery(key, subscribe, accept);
  return query;
}
