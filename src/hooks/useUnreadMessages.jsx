import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useUnreadMessages(mode, user) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const loadCount = async () => {
      try {
        let filter;
        if (mode === 'admin') {
          filter = { sender_role: { $ne: 'admin' }, read: false };
        } else {
          filter = { sender_role: 'admin', thread_partner_id: user.id, read: false };
        }
        const data = await base44.entities.Message.filter(filter);
        setUnreadCount(data.length);
      } catch (e) { /* ignore */ }
    };

    loadCount();

    const unsubscribe = base44.entities.Message.subscribe(() => {
      loadCount();
    });

    return unsubscribe;
  }, [mode, user?.id]);

  return unreadCount;
}