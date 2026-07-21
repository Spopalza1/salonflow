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

export function useAdminNotifications() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const knownOrderIds = useRef(new Set());
  const knownServiceIds = useRef(new Set());
  const completedServiceIds = useRef(new Set());
  const knownNoteIds = useRef(new Set());
  const knownGuestMessageIds = useRef(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const loadExisting = async () => {
      try {
        const [orders, services, notes, guestMessages] = await Promise.all([
          base44.entities.Order.filter({}, '-created_date', 100),
          base44.entities.Service.filter({ status: 'ongoing' }, '-created_date'),
          base44.entities.ServiceNote.list('created_date', 500),
          base44.entities.GuestMessage.list('created_date', 100),
        ]);
        orders.forEach(o => knownOrderIds.current.add(o.id));
        services.forEach(s => knownServiceIds.current.add(s.id));
        notes.forEach(n => knownNoteIds.current.add(n.id));
        guestMessages.forEach(g => knownGuestMessageIds.current.add(g.id));
      } catch (e) { /* ignore */ }
    };
    loadExisting();

    const unsubOrders = base44.entities.Order.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownOrderIds.current.has(event.data.id)) return;
      knownOrderIds.current.add(event.data.id);
      const chair = event.data.chair_table ? ` (${event.data.chair_table})` : '';
      notify('New Order Received', `${event.data.requested_by_name} requested ${event.data.item_name}${chair}`);
      base44.entities.Notification.create({
        title: 'New Order Received',
        body: `${event.data.requested_by_name} requested ${event.data.item_name}${chair}`,
        type: 'order',
      });
      toastRef.current({
        title: 'New Order Received',
        description: `${event.data.requested_by_name} requested ${event.data.item_name}${chair}`,
      });
    });

    const unsubServices = base44.entities.Service.subscribe((event) => {
      if (event.type === 'create') {
        if (knownServiceIds.current.has(event.data.id)) return;
        knownServiceIds.current.add(event.data.id);
        notify('New Service Started', `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`);
        base44.entities.Notification.create({
          title: 'New Service Started',
          body: `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`,
          type: 'service',
        });
      } else if (event.type === 'update') {
        if (event.data.status === 'completed' && !completedServiceIds.current.has(event.data.id)) {
          completedServiceIds.current.add(event.data.id);
          notify('Service Completed', `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`);
          base44.entities.Notification.create({
            title: 'Service Completed',
            body: `${event.data.stylist_name}: ${event.data.client_name} — ${event.data.service_name}`,
            type: 'service',
          });
        }
      }
    });

    const unsubNotes = base44.entities.ServiceNote.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownNoteIds.current.has(event.data.id)) return;
      knownNoteIds.current.add(event.data.id);
      notify(`Service Update From ${event.data.author_name}`, event.data.content);
      base44.entities.Notification.create({
        title: `Service Update From ${event.data.author_name}`,
        body: event.data.content,
        type: 'service_note',
      });
    });

    const unsubGuestMessages = base44.entities.GuestMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      if (knownGuestMessageIds.current.has(event.data.id)) return;
      knownGuestMessageIds.current.add(event.data.id);
      notify(`New Message From ${event.data.guest_name}`, event.data.message);
      base44.entities.Notification.create({
        title: `New Message From ${event.data.guest_name}`,
        body: event.data.message,
        type: 'guest_message',
      });
      toastRef.current({
        title: `New Message From ${event.data.guest_name}`,
        description: event.data.message,
      });
    });

    return () => {
      unsubOrders();
      unsubServices();
      unsubNotes();
      unsubGuestMessages();
    };
  }, []);
}