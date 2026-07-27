import { useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNotifications } from '@/lib/NotificationContext';

export function useStylistNotifications(user) {
  const { addLocalNotification } = useNotifications();
  const seenRef = useRef({ messages: new Set(), keys: new Set() });

  const createMessageAlert = useCallback(async (message) => {
    if (!message || String(message.salon_id) !== String(user?.salon_id) || String(message.sender_id) === String(user?.id)) return;
    if (String(message.thread_partner_id) !== String(user?.id)) return;
    const key = `message:${message.id}:${user.id}`;
    if (seenRef.current.keys.has(key)) return;
    seenRef.current.keys.add(key);
    const payload = {
      id: `local-${key}`,
      _local: true,
      title: `New message from ${message.sender_name || 'Front Desk'}`,
      body: message.body || `Sent a ${message.media_type || 'message'}`,
      type: 'chat_message',
      priority: 'normal',
      salon_id: user.salon_id,
      recipient_user_id: user.id,
      sender_user_id: message.sender_id,
      source_id: message.id,
      source_type: 'message',
      conversation_id: user.id,
      message_id: message.id,
      target_tab: 'chat',
      target_route: '/stylist',
      target_parameters: { partner_id: user.id },
      group_key: `conversation:${user.id}`,
      idempotency_key: key,
      target_role: user.role,
      read: false,
      created_date: new Date().toISOString(),
    };

    try {
      const existing = await base44.entities.Notification.filter({ salon_id: user.salon_id, recipient_user_id: user.id, idempotency_key: key }, '-created_date', 1);
      if (existing?.length) return addLocalNotification(existing[0]);
      addLocalNotification(payload);
      const { id: _localId, _local, ...persistedPayload } = payload;
      const created = await base44.entities.Notification.create(persistedPayload);
      if (created) addLocalNotification(created);
    } catch (error) {
      addLocalNotification(payload);
      console.warn('Stylist notification persistence unavailable; keeping in-app alert:', error);
    }
  }, [addLocalNotification, user?.id, user?.role, user?.salon_id]);

  useEffect(() => {
    if (!user?.id || !user?.salon_id || !['stylist', 'user'].includes(user.role)) return;
    seenRef.current = { messages: new Set(), keys: new Set() };
    let cancelled = false;

    const reconcile = async () => {
      try {
        const messages = await base44.entities.Message.filter({ salon_id: user.salon_id }, '-created_date', 200);
        if (cancelled) return;
        for (const message of messages) {
          if (!seenRef.current.messages.has(message.id)) {
            seenRef.current.messages.add(message.id);
            await createMessageAlert(message);
          }
        }
      } catch (error) {
        console.error('Stylist notification reconciliation failed:', error);
      }
    };

    reconcile();
    const onFocus = () => reconcile();
    window.addEventListener('focus', onFocus);
    const recoveryTimer = window.setInterval(reconcile, 5000);
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create' || !event.data || seenRef.current.messages.has(event.data.id)) return;
      seenRef.current.messages.add(event.data.id);
      createMessageAlert(event.data);
    });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(recoveryTimer);
      unsubscribe?.();
    };
  }, [createMessageAlert, user?.id, user?.role, user?.salon_id]);
}
