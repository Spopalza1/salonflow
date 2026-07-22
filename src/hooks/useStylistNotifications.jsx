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
const stylistKnownOrderIds = new Set();
const stylistKnownOrderStatus = new Map();
const stylistKnownMessageIds = new Set();
const stylistCreatedNotificationKeys = new Set();

async function dedupCreateNotification(key, data) {
  if (stylistCreatedNotificationKeys.has(key)) return;
  stylistCreatedNotificationKeys.add(key);
  try {
    if (data.source_id) {
      const existing = await base44.entities.Notification.filter(
        { source_id: data.source_id, type: data.type },
        '-created_date',
        1
      );
      if (existing.length > 0) return existing[0];
    }
    return await base44.entities.Notification.create(data);
  } catch (e) {
    stylistCreatedNotificationKeys.delete(key);
    throw e;
  }
}

export function useStylistNotifications(user) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!user?.id) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const loadExisting = async () => {
      try {
        const [orders, messages] = await Promise.all([
          base44.entities.Order.filter(
            { requested_by_user_id: user.id, salon_id: user.salon_id },
            '-created_date',
            100
          ),
          base44.entities.Message.filter({ salon_id: user.salon_id }, 'created_date', 100),
        ]);
        orders.forEach(o => {
          stylistKnownOrderIds.add(o.id);
          if (o.status !== 'pending') {
            stylistKnownOrderStatus.set(o.id, o.status);
          }
        });
        messages.forEach(m => stylistKnownMessageIds.add(m.id));
      } catch (e) { /* ignore */ }
    };
    loadExisting();

    // --- Order status updates for this stylist's orders ---
    const unsubOrders = base44.entities.Order.subscribe((event) => {
      if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.data.requested_by_user_id !== user.id) return;

      if (event.type === 'create') {
        if (stylistKnownOrderIds.has(event.data.id)) return;
        stylistKnownOrderIds.add(event.data.id);
        // Don't notify on create — stylist placed the order themselves
        return;
      }

      if (event.type !== 'update') return;

      const prevStatus = stylistKnownOrderStatus.get(event.data.id);
      const newStatus = event.data.status;
      if (prevStatus === newStatus) return;
      stylistKnownOrderStatus.set(event.data.id, newStatus);

      const itemName = event.data.item_name || 'Your order';

      if (newStatus === 'preparing') {
        const title = 'Order Update';
        const body = `Your ${itemName} is being prepared`;
        notify(title, body);
        dedupCreateNotification(`stylist_order_preparing:${event.data.id}`, {
          title, body, type: 'order', salon_id: user.salon_id, source_id: event.data.id,
        });
        toastRef.current({ title, description: body });
      } else if (newStatus === 'served') {
        const title = 'Order Served';
        const body = `Your ${itemName} is ready!`;
        notify(title, body);
        dedupCreateNotification(`stylist_order_served:${event.data.id}`, {
          title, body, type: 'order', salon_id: user.salon_id, source_id: event.data.id,
        });
        toastRef.current({ title, description: body });
      } else if (newStatus === 'cancelled') {
        const title = 'Order Cancelled';
        const body = `Your ${itemName} has been cancelled`;
        notify(title, body);
        dedupCreateNotification(`stylist_order_cancelled:${event.data.id}`, {
          title, body, type: 'order', salon_id: user.salon_id, source_id: event.data.id,
        });
        toastRef.current({ title, description: body });
      }
    });

    // --- Chat messages from admin to this stylist ---
    const unsubMessages = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create') return;
      if (stylistKnownMessageIds.has(event.data.id)) return;
      stylistKnownMessageIds.add(event.data.id);
      if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.data.sender_id === user.id) return;
      if (event.data.sender_role !== 'admin') return;
      if (event.data.thread_partner_id !== user.id) return;

      const isServiceUpdate = event.data.message_type === 'service_update';
      const title = isServiceUpdate
        ? `Service Update From ${event.data.sender_name}`
        : `New Message From ${event.data.sender_name}`;
      const body = event.data.body || (event.data.media_type ? `Sent a ${event.data.media_type}` : '');

      notify(title, body);
      dedupCreateNotification(`stylist_message:${event.data.id}`, {
        title, body,
        type: isServiceUpdate ? 'service_update' : 'chat',
        salon_id: user.salon_id,
        source_id: event.data.id,
      });
      toastRef.current({ title, description: body });
    });

    return () => {
      unsubOrders();
      unsubMessages();
    };
  }, [user?.id, user?.salon_id]);
}