import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationRepository } from '../api/notificationRepository';
import { queryKeys } from '@/shared/query/queryKeys';
import { useRealtimeQuery } from '@/shared/query/useRealtimeQuery';

export function useNotificationInbox(salonId, userId) {
  const key = queryKeys.notifications(salonId, userId);
  const query = useQuery({ queryKey: key, enabled: Boolean(salonId && userId), queryFn: () => notificationRepository.listForRecipient(salonId, userId) });
  const subscribe = useCallback((handler) => notificationRepository.subscribe(handler), []);
  const accept = useCallback((event) => !event.data || (String(event.data.salon_id) === String(salonId) && String(event.data.recipient_user_id) === String(userId)), [salonId, userId]);
  useRealtimeQuery(key, subscribe, accept);
  return query;
}
