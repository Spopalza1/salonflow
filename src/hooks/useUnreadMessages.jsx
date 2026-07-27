import { useMemo } from 'react';
import { useNotifications } from '@/lib/NotificationContext';

export function useUnreadMessages(mode, user) {
  const { unreadNotifications } = useNotifications();
  return useMemo(() => unreadNotifications.filter(n => {
    if (!user?.id || n.recipient_user_id !== user.id) return false;
    return ['chat', 'chat_message'].includes(n.type) || n.target_tab === 'chat';
  }).length, [unreadNotifications, user?.id, mode]);
}
