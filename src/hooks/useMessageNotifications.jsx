import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useMessageNotifications(mode, user) {
  const knownIds = useRef(new Set());

  useEffect(() => {
    if (!user?.id) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Track existing message IDs so we only notify for genuinely new messages
    const loadExisting = async () => {
      try {
        const existing = await base44.entities.Message.list('created_date', 500);
        existing.forEach(m => knownIds.current.add(m.id));
      } catch (e) { /* ignore */ }
    };
    loadExisting();

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownIds.current.has(event.data.id)) return;
      knownIds.current.add(event.data.id);

      const msg = event.data;
      if (msg.sender_id === user.id) return; // don't notify for own messages

      const shouldNotify =
        (mode === 'admin' && msg.sender_role === 'stylist') ||
        (mode === 'stylist' && msg.sender_role === 'admin' && msg.thread_partner_id === user.id);

      if (shouldNotify && 'Notification' in window && Notification.permission === 'granted') {
        const title = mode === 'admin' ? 'New message from stylist' : 'New message from front desk';
        new Notification(title, { body: `${msg.sender_name}: ${msg.body}` });
      }
    });

    return unsubscribe;
  }, [mode, user?.id]);
}