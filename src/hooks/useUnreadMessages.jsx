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

    const isRelevant = (msg) => {
      if (mode === 'admin') return msg.sender_role !== 'admin';
      return msg.sender_role === 'admin' && msg.thread_partner_id === user.id;
    };

    let reloadTimer;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        if (isRelevant(event.data) && !event.data.read) {
          setUnreadCount(prev => prev + 1);
        }
      } else if (event.type === 'update') {
        if (isRelevant(event.data) && event.data.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else {
        loadCount();
      }
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(loadCount, 1000);
    });

    return () => {
      clearTimeout(reloadTimer);
      unsubscribe();
    };
  }, [mode, user?.id]);

  return unreadCount;
}