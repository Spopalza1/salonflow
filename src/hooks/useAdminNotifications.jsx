import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) { /* ignore */ }
}

function notify(title, body) {
  playBeep();
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// Module-level Sets prevent duplicate notifications across hook re-mounts (e.g. React StrictMode)
const knownOrderIds = new Set();
const knownServiceIds = new Set();
const completedServiceIds = new Set();
const knownNoteIds = new Set();
const knownGuestMessageIds = new Set();
const knownMessageIds = new Set();
const orderNotificationMap = new Map(); // orderId -> notificationId
const pendingNotifications = new Map(); // dedupKey -> Promise<notification>

async function dedupCreateNotification(key, data) {
  if (pendingNotifications.has(key)) return pendingNotifications.get(key);
  const promise = base44.entities.Notification.create(data);
  pendingNotifications.set(key, promise);
  try {
    return await promise;
  } finally {
    setTimeout(() => pendingNotifications.delete(key), 10000);
  }
}

export function useAdminNotifications() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const loadExisting = async () => {
      try {
        const [orders, services, notes, guestMessages, messages] = await Promise.all([
          base44.entities.Order.filter({}, '-created_date', 100),
          base44.entities.Service.filter({ status: 'ongoing' }, '-created_date'),
          base44.entities.ServiceNote.list('created_date', 500),
          base44.entities.GuestMessage.list('created_date', 100),
          base44.entities.Message.list('created_date', 100),
        ]);
        orders.forEach(o => knownOrderIds.add(o.id));
        services.forEach(s => knownServiceIds.add(s.id));
        notes.forEach(n => knownNoteIds.add(n.id));
        guestMessages.forEach(g => knownGuestMessageIds.add(g.id));
        messages.forEach(m => knownMessageIds.add(m.id));
      } catch (e) { /* ignore */ }
    };
    loadExisting();

    const unsubOrders = base44.entities.Order.subscribe(async (event) => {
      if (event.type === 'create') {
        if (knownOrderIds.has(event.data.id)) return;
        knownOrderIds.add(event.data.id);
        const chair = event.data.chair_table ? ` (${event.data.chair_table})` : '';
        notify('New Order Received', `${event.data.requested_by_name} requested ${event.data.item_name}${chair}`);
        const notif = await dedupCreateNotification(`order:${event.data.id}`, {
          title: 'New Order Received',
          body: `${event.data.requested_by_name} requested ${event.data.item_name}${chair}`,
          type: 'order',
        });
        orderNotificationMap.set(event.data.id, notif.id);
        toastRef.current({
          title: 'New Order Received',
          description: `${event.data.requested_by_name} requested ${event.data.item_name}${chair}`,
        });
      } else if (event.type === 'update' && event.data.status === 'served') {
        const notifId = orderNotificationMap.get(event.data.id);
        if (notifId) {
          orderNotificationMap.delete(event.data.id);
          try {
            await base44.entities.Notification.delete(notifId);
          } catch (e) { /* already deleted */ }
        }
      }
    });

    const unsubServices = base44.entities.Service.subscribe((event) => {
      if (event.type === 'create') {
        if (knownServiceIds.has(event.data.id)) return;
        knownServiceIds.add(event.data.id);
        notify('New Service Started', `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`);
        dedupCreateNotification(`service:${event.data.id}`, {
          title: 'New Service Started',
          body: `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`,
          type: 'service',
        });
      } else if (event.type === 'update') {
        if (event.data.status === 'completed' && !completedServiceIds.has(event.data.id)) {
          completedServiceIds.add(event.data.id);
          notify('Service Completed', `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`);
          dedupCreateNotification(`service_completed:${event.data.id}`, {
            title: 'Service Completed',
            body: `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`,
            type: 'service',
          });
        }
      }
    });

    const unsubNotes = base44.entities.ServiceNote.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownNoteIds.has(event.data.id)) return;
      knownNoteIds.add(event.data.id);
      notify(`Service Update From ${event.data.author_name}`, event.data.content);
      dedupCreateNotification(`note:${event.data.id}`, {
        title: `Service Update From ${event.data.author_name}`,
        body: event.data.content,
        type: 'service_note',
      });
    });

    const unsubGuestMessages = base44.entities.GuestMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownGuestMessageIds.has(event.data.id)) return;
      knownGuestMessageIds.add(event.data.id);
      notify(`New Message From ${event.data.guest_name}`, event.data.message);
      dedupCreateNotification(`guest:${event.data.id}`, {
        title: `New Message From ${event.data.guest_name}`,
        body: event.data.message,
        type: 'guest_message',
      });
      toastRef.current({
        title: `New Message From ${event.data.guest_name}`,
        description: event.data.message,
      });
    });

    const unsubMessages = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownMessageIds.has(event.data.id)) return;
      knownMessageIds.add(event.data.id);
      if (event.data.sender_role === 'admin') return; // Don't notify for admin's own messages
      const isServiceUpdate = event.data.message_type === 'service_update';
      const title = isServiceUpdate
        ? `Service Update From ${event.data.sender_name}`
        : `New Chat From ${event.data.sender_name}`;
      const body = event.data.body || (event.data.media_type ? `Sent a ${event.data.media_type}` : '');
      notify(title, body);
      dedupCreateNotification(`message:${event.data.id}`, {
        title,
        body,
        type: isServiceUpdate ? 'service_update' : 'chat',
      });
      toastRef.current({
        title,
        description: body,
      });
    });

    return () => {
      unsubOrders();
      unsubServices();
      unsubNotes();
      unsubGuestMessages();
      unsubMessages();
    };
  }, []);
}