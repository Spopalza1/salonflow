import { useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNotifications } from '@/lib/NotificationContext';

const isoNow = () => new Date().toISOString();

export function useAdminNotifications() {
  const { user } = useAuth();
  const { addLocalNotification } = useNotifications();
  const seenRef = useRef({ message: new Set(), order: new Map(), service: new Map(), note: new Set(), guest: new Set(), keys: new Set() });

  const publish = useCallback(async ({ key, title, body, type, sourceId, sourceType, targetTab, extra = {}, priority = 'normal' }) => {
    if (!user?.id || !user?.salon_id || user.role !== 'admin' || !key) return;
    const seen = seenRef.current.keys;
    if (seen.has(key)) return;
    seen.add(key);

    const payload = {
      id: `local-${key}`,
      _local: true,
      title,
      body: body || 'New SalonFlow activity requires your attention.',
      type,
      priority,
      salon_id: user.salon_id,
      recipient_user_id: user.id,
      sender_user_id: extra.sender_user_id,
      source_id: sourceId,
      source_type: sourceType,
      conversation_id: extra.conversation_id,
      message_id: extra.message_id,
      order_id: extra.order_id,
      service_id: extra.service_id,
      request_id: extra.request_id,
      target_tab: targetTab,
      target_route: '/front-desk',
      target_parameters: extra.target_parameters || {},
      group_key: extra.group_key || `${sourceType}:${extra.conversation_id || extra.order_id || extra.service_id || sourceId || type}`,
      idempotency_key: key,
      target_role: 'admin',
      read: false,
      created_date: isoNow(),
    };

    try {
      const existing = await base44.entities.Notification.filter(
        { salon_id: user.salon_id, recipient_user_id: user.id, idempotency_key: key },
        '-created_date',
        1
      );
      if (existing?.length) {
        addLocalNotification(existing[0]);
        return;
      }

      // Recovery fallback: server functions remain the primary producers, but
      // a dropped/failed trigger must not make the in-app pipeline permanently
      // lose an event. The idempotency key prevents duplicate durable records.
      const { id: _localId, _local, ...persistedPayload } = payload;
      const created = await base44.entities.Notification.create(persistedPayload);
      if (created) addLocalNotification(created);
    } catch (error) {
      console.warn('Notification observation failed; backend delivery remains authoritative:', error);
    }
  }, [addLocalNotification, user?.id, user?.salon_id, user?.role]);

  const messageAlert = useCallback((message) => {
    if (!message || String(message.salon_id) !== String(user?.salon_id) || String(message.sender_id) === String(user?.id)) return;
    // Any non-admin sender in the salon is an incoming front-desk conversation.
    if (message.sender_role === 'admin' && String(message.thread_partner_id) !== String(user?.id)) return;
    const conversationId = message.sender_role === 'admin' ? message.thread_partner_id : (message.thread_partner_id || message.sender_id);
    publish({
      key: `message:${message.id}:${user.id}`,
      title: `New message from ${message.sender_name || 'team member'}`,
      body: message.body || `Sent a ${message.media_type || 'message'}`,
      type: 'chat_message',
      sourceId: message.id,
      sourceType: 'message',
      targetTab: 'chat',
      extra: {
        sender_user_id: message.sender_id,
        conversation_id: conversationId,
        message_id: message.id,
        target_parameters: { partner_id: conversationId },
        group_key: `conversation:${conversationId}`,
      },
    });
  }, [publish, user?.id, user?.salon_id]);

  const orderAlert = useCallback((order, eventType = 'created') => {
    if (!order || String(order.salon_id) !== String(user?.salon_id)) return;
    const chair = order.chair_table ? ` (${order.chair_table})` : '';
    const isUpdate = eventType === 'updated';
    publish({
      key: `${isUpdate ? `order-update:${order.status || 'changed'}` : 'order'}:${order.id}:${user.id}`,
      title: isUpdate ? `Order ${order.status || 'updated'}` : (order.is_pre_order ? 'New pre-arrival order' : 'New order received'),
      body: `${order.requested_by_name || 'Guest'} — ${order.item_name || 'order'}${chair}`,
      type: isUpdate ? 'order_update' : 'order_created',
      priority: order.is_pre_order || order.status === 'pending' ? 'high' : 'normal',
      sourceId: order.id,
      sourceType: 'order',
      targetTab: 'orders',
      extra: { order_id: order.id, group_key: `order:${order.id}` },
    });
  }, [publish, user?.id, user?.salon_id]);

  useEffect(() => {
    if (!user?.id || !user?.salon_id || user.role !== 'admin') return;
    seenRef.current = { message: new Set(), order: new Map(), service: new Map(), note: new Set(), guest: new Set(), keys: new Set() };
    let cancelled = false;

    const reconcile = async () => {
      try {
        const [messages, orders, services, notes, guests] = await Promise.all([
          base44.entities.Message.filter({ salon_id: user.salon_id }, '-created_date', 200),
          base44.entities.Order.filter({ salon_id: user.salon_id }, '-created_date', 200),
          base44.entities.Service.filter({ salon_id: user.salon_id }, '-created_date', 200),
          base44.entities.ServiceNote.filter({ salon_id: user.salon_id }, '-created_date', 200),
          base44.entities.GuestMessage.filter({ salon_id: user.salon_id }, '-created_date', 100),
        ]);
        if (cancelled) return;
        // Reconcile is an active recovery path. If realtime or a backend trigger was
        // missed, publish() restores exactly one durable recipient record.
        for (const message of messages) {
          if (!seenRef.current.message.has(message.id)) {
            seenRef.current.message.add(message.id);
            await messageAlert(message);
          }
        }
        for (const order of orders) {
          if (!seenRef.current.order.has(order.id)) await orderAlert(order, 'created');
          seenRef.current.order.set(order.id, order.status);
        }
        for (const service of services) {
          if (!seenRef.current.service.has(service.id)) {
            await publish({ key: `service:${service.id}:${user.id}`, title: 'New service started', body: `${service.stylist_name || 'Stylist'} — ${service.client_name || 'client'} — ${service.service_name || 'service'}`, type: 'service_request', sourceId: service.id, sourceType: 'service', targetTab: 'services', extra: { service_id: service.id, sender_user_id: service.stylist_id } });
          }
          seenRef.current.service.set(service.id, service.status);
        }
        for (const note of notes) {
          if (!seenRef.current.note.has(note.id)) {
            seenRef.current.note.add(note.id);
            await publish({ key: `note:${note.id}:${user.id}`, title: `Service update from ${note.author_name || 'stylist'}`, body: note.content, type: 'service_note', sourceId: note.id, sourceType: 'service_note', targetTab: 'services', extra: { service_id: note.service_id, sender_user_id: note.author_id } });
          }
        }
        for (const guest of guests) {
          if (!seenRef.current.guest.has(guest.id)) {
            seenRef.current.guest.add(guest.id);
            await publish({ key: `guest:${guest.id}:${user.id}`, title: `New message from ${guest.guest_name || 'guest'}`, body: guest.message, type: 'guest_message', sourceId: guest.id, sourceType: 'guest_message', targetTab: 'messages' });
          }
        }

      } catch (error) {
        console.error('Admin activity reconciliation failed:', error);
      }
    };

    reconcile();
    const onFocus = () => reconcile();
    window.addEventListener('focus', onFocus);
    // Realtime remains primary, while polling recovers from dropped websocket
    // events and from laptops waking after sleep.
    const recoveryTimer = window.setInterval(reconcile, 5000);

    const unsubMessages = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create' || !event.data || seenRef.current.message.has(event.data.id)) return;
      seenRef.current.message.add(event.data.id);
      messageAlert(event.data);
    });

    const unsubOrders = base44.entities.Order.subscribe((event) => {
      if (!event.data || String(event.data.salon_id) !== String(user.salon_id)) return;
      const previousStatus = seenRef.current.order.get(event.data.id);
      seenRef.current.order.set(event.data.id, event.data.status);
      if (event.type === 'create') orderAlert(event.data, 'created');
      else if (event.type === 'update' && previousStatus !== event.data.status) orderAlert(event.data, 'updated');
    });

    const unsubServices = base44.entities.Service.subscribe((event) => {
      if (!event.data || String(event.data.salon_id) !== String(user.salon_id)) return;
      const previousStatus = seenRef.current.service.get(event.data.id);
      seenRef.current.service.set(event.data.id, event.data.status);
      if (event.type === 'create') {
        publish({ key: `service:${event.data.id}:${user.id}`, title: 'New service started', body: `${event.data.stylist_name || 'Stylist'} — ${event.data.client_name || 'client'} — ${event.data.service_name || 'service'}`, type: 'service_request', sourceId: event.data.id, sourceType: 'service', targetTab: 'services', extra: { service_id: event.data.id } });
      } else if (event.type === 'update' && previousStatus !== event.data.status) {
        publish({ key: `service-update:${event.data.status}:${event.data.id}:${user.id}`, title: `Service ${event.data.status || 'updated'}`, body: `${event.data.stylist_name || 'Stylist'} — ${event.data.client_name || 'client'}`, type: 'service_update', sourceId: event.data.id, sourceType: 'service', targetTab: 'services', extra: { service_id: event.data.id } });
      }
    });

    const unsubNotes = base44.entities.ServiceNote.subscribe((event) => {
      if (event.type !== 'create' || !event.data || String(event.data.salon_id) !== String(user.salon_id) || seenRef.current.note.has(event.data.id)) return;
      seenRef.current.note.add(event.data.id);
      publish({ key: `note:${event.data.id}:${user.id}`, title: `Service update from ${event.data.author_name || 'stylist'}`, body: event.data.content, type: 'service_note', sourceId: event.data.id, sourceType: 'service_note', targetTab: 'services', extra: { service_id: event.data.service_id, sender_user_id: event.data.author_id } });
    });

    const unsubGuests = base44.entities.GuestMessage.subscribe((event) => {
      if (event.type !== 'create' || !event.data || String(event.data.salon_id) !== String(user.salon_id) || seenRef.current.guest.has(event.data.id)) return;
      seenRef.current.guest.add(event.data.id);
      publish({ key: `guest:${event.data.id}:${user.id}`, title: `New message from ${event.data.guest_name || 'guest'}`, body: event.data.message, type: 'guest_message', sourceId: event.data.id, sourceType: 'guest_message', targetTab: 'messages' });
    });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(recoveryTimer);
      unsubMessages?.(); unsubOrders?.(); unsubServices?.(); unsubNotes?.(); unsubGuests?.();
    };
  }, [messageAlert, orderAlert, publish, user?.id, user?.salon_id, user?.role]);
}
