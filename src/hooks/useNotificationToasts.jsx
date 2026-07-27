import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNotifications } from '@/lib/NotificationContext';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function useNotificationToasts() {
  const { user } = useAuth();
  const { notifications, navigateFromNotification } = useNotifications();
  const { toast } = useToast();
  const seenRef = useRef(new Set());
  const userRef = useRef(null);

  useEffect(() => {
    if (!user?.id || !user?.salon_id) {
      seenRef.current.clear();
      userRef.current = null;
      return;
    }
    if (userRef.current !== user.id) {
      seenRef.current.clear();
      userRef.current = user.id;
    }

    const now = Date.now();
    const fresh = notifications
      .filter(n => !n.read && !n.read_at && !seenRef.current.has(n.id))
      .filter(n => {
        // Local notifications are always immediate. Persisted notifications toast only
        // when recent, preventing a flood of old alerts after login.
        if (n._local || String(n.id).startsWith('local-')) return true;
        const created = new Date(n.created_date || n.created_at || 0).getTime();
        return Number.isFinite(created) && now - created < 30000;
      })
      .sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));

    fresh.forEach(n => {
      seenRef.current.add(n.id);
      const open = () => navigateFromNotification(n);
      toast({
        title: n.title || 'SalonFlow activity',
        description: n.body || 'New activity requires your attention.',
        duration: n.priority === 'critical' ? Infinity : 8000,
        action: <ToastAction altText={`Open ${n.title || 'notification'}`} onClick={open}>Open</ToastAction>,
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const system = new Notification(n.title || 'SalonFlow', { body: n.body, tag: n.group_key || n.id });
          system.onclick = () => { window.focus(); open(); system.close(); };
        } catch (error) {
          console.warn('Native notification unavailable:', error);
        }
      }
    });
  }, [notifications, user?.id, user?.salon_id, toast, navigateFromNotification]);
}
