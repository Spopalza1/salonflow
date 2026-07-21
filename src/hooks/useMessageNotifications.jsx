import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

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
        (mode === 'admin' && msg.sender_role !== 'admin') ||
        (mode === 'stylist' && msg.sender_role === 'admin' && msg.thread_partner_id === user.id);

      if (shouldNotify) {
        playBeep();

        const isServiceUpdate = msg.message_type === 'service_update';

        if ('Notification' in window && Notification.permission === 'granted') {
          const title = isServiceUpdate
            ? `Service Update From ${msg.sender_name}`
            : 'New Message Received';
          new Notification(title, { body: msg.body });
        }
      }
    });

    return unsubscribe;
  }, [mode, user?.id]);
}