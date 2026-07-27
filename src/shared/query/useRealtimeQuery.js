import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyRealtimeEvent } from './applyRealtimeEvent';

export function useRealtimeQuery(queryKey, subscribe, accept = () => true) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe((event) => {
      if (!accept(event)) return;
      queryClient.setQueryData(queryKey, (current = []) => applyRealtimeEvent(current, event));
    });
  }, [queryClient, subscribe, accept, JSON.stringify(queryKey)]);
}
