import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { notificationService } from '@/features/notifications/services/notificationService';

const NotificationContext = createContext(null);

const TAB_BY_TYPE = {
  order: 'orders', order_created: 'orders', order_update: 'orders',
  service: 'services', service_request: 'services', service_note: 'services', service_update: 'services',
  guest_message: 'messages',
  chat: 'chat', chat_message: 'chat',
  menu_request: 'menu',
  stylist_status: 'stylists',
  report_ready: 'report',
  payment_update: 'payments',
  appointment_update: 'appointments',
  system_update: 'notifications', announcement: 'notifications', general_alert: 'notifications',
};

const routeForRole = (role) => role === 'admin' ? '/front-desk' : '/stylist';

const notificationDate = () => new Date().toISOString();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !user?.salon_id) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const data = await base44.entities.Notification.filter(
        { salon_id: user.salon_id, recipient_user_id: user.id },
        '-created_date',
        200
      );
      setNotifications(data.filter(n => !n.dismissed_at));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.salon_id]);

  useEffect(() => {
    loadNotifications();
    if (!user?.id || !user?.salon_id) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      const currentUser = userRef.current;
      if (!currentUser?.id) return;
      if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
        return;
      }
      if (!event.data) return;
      if (String(event.data.salon_id) !== String(currentUser.salon_id)) return;
      if (String(event.data.recipient_user_id) !== String(currentUser.id)) return;
      if (event.type === 'create') {
        setNotifications(prev => prev.some(n => n.id === event.data.id) ? prev : [event.data, ...prev].slice(0, 200));
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.data.id ? event.data : n).filter(n => !n.dismissed_at));
      }
    });
    return unsubscribe;
  }, [loadNotifications, user?.id, user?.salon_id]);

  const addLocalNotification = useCallback((notification) => {
    if (!notification) return;
    const currentUser = userRef.current;
    if (!currentUser?.id || String(notification.recipient_user_id) !== String(currentUser.id) || String(notification.salon_id) !== String(currentUser.salon_id)) return;
    const normalized = {
      read: false,
      created_date: new Date().toISOString(),
      ...notification,
      id: notification.id || `local-${notification.idempotency_key || Date.now()}-${Math.random().toString(36).slice(2)}`,
      _local: notification._local ?? !notification.id,
    };
    setNotifications(prev => {
      const duplicateIndex = prev.findIndex(n =>
        n.id === normalized.id ||
        (normalized.idempotency_key && n.idempotency_key === normalized.idempotency_key)
      );
      if (duplicateIndex >= 0) {
        const next = [...prev];
        next[duplicateIndex] = { ...next[duplicateIndex], ...normalized };
        return next.filter(n => !n.dismissed_at).slice(0, 200);
      }
      return [normalized, ...prev].filter(n => !n.dismissed_at).slice(0, 200);
    });
  }, []);

  const unreadNotifications = useMemo(() => notifications.filter(n => !n.read && !n.read_at), [notifications]);

  const getUnreadCountForTab = useCallback((tab) => unreadNotifications.filter(n => (n.target_tab || TAB_BY_TYPE[n.type]) === tab).length, [unreadNotifications]);
  const getUnreadCountForConversation = useCallback((conversationId) => unreadNotifications.filter(n => n.conversation_id === conversationId || n.target_parameters?.partner_id === conversationId).length, [unreadNotifications]);

  const patchNotification = useCallback(async (id, patch) => {
    const previous = notifications;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n).filter(n => !n.dismissed_at));
    const target = previous.find(n => n.id === id);
    if (target?._local || String(id).startsWith('local-')) return;
    try {
      if (patch.dismissed_at) await notificationService.dismiss(id);
      else if (patch.opened_at) await notificationService.open(id);
      else if (patch.read || patch.read_at) await notificationService.markRead(id);
      else await base44.entities.Notification.update(id, patch);
    } catch (error) {
      setNotifications(previous);
      throw error;
    }
  }, [notifications]);

  const markNotificationRead = useCallback(async (id) => {
    const n = notifications.find(item => item.id === id);
    if (!n || n.read || n.read_at) return;
    await patchNotification(id, { read: true, read_at: notificationDate() });
  }, [notifications, patchNotification]);

  const updateMatching = useCallback(async (predicate, { resolve = false } = {}) => {
    const matches = notifications.filter(n => !n.dismissed_at && predicate(n));
    if (!matches.length) return;
    const stamp = notificationDate();
    const patch = resolve
      ? { read: true, read_at: stamp, opened_at: stamp, dismissed_at: stamp }
      : { read: true, read_at: stamp };
    setNotifications(prev => prev
      .map(n => matches.some(m => m.id === n.id) ? { ...n, ...patch } : n)
      .filter(n => !n.dismissed_at));
    const persistedMatches = matches.filter(n => !n._local && !String(n.id).startsWith('local-'));
    const results = await Promise.allSettled(persistedMatches.map(n => base44.entities.Notification.update(n.id, patch)));
    if (results.some(r => r.status === 'rejected')) await loadNotifications();
  }, [notifications, loadNotifications]);

  const markMatchingRead = useCallback((predicate) => updateMatching(predicate), [updateMatching]);
  const markNotificationsForSourceRead = useCallback((sourceType, sourceId) => updateMatching(n => n.source_type === sourceType && n.source_id === sourceId, { resolve: true }), [updateMatching]);
  const markConversationNotificationsRead = useCallback((conversationId) => updateMatching(n => n.conversation_id === conversationId || n.target_parameters?.partner_id === conversationId, { resolve: true }), [updateMatching]);
  const markNotificationsForServiceRead = useCallback((serviceId) => updateMatching(n => n.service_id === serviceId || (n.source_type === 'service' && n.source_id === serviceId), { resolve: true }), [updateMatching]);
  const markNotificationsForOrderRead = useCallback((orderId) => updateMatching(n => n.order_id === orderId || (n.source_type === 'order' && n.source_id === orderId), { resolve: true }), [updateMatching]);
  const markNotificationsForGuestMessageRead = useCallback((messageId) => updateMatching(n => n.source_type === 'guest_message' && n.source_id === messageId, { resolve: true }), [updateMatching]);
  const markTabLevelNotificationsRead = useCallback((tab) => updateMatching(n => (n.target_tab || TAB_BY_TYPE[n.type]) === tab && !n.source_id, { resolve: true }), [updateMatching]);

  const dismissNotification = useCallback(async (id) => {
    await patchNotification(id, { dismissed_at: notificationDate(), read: true, read_at: notificationDate() });
  }, [patchNotification]);

  const markAllRead = useCallback(async () => markMatchingRead(() => true), [markMatchingRead]);

  const navigateFromNotification = useCallback(async (notification, options = {}) => {
    if (!notification) return;
    const currentUser = userRef.current;
    if (!currentUser || notification.recipient_user_id !== currentUser.id || notification.salon_id !== currentUser.salon_id) return;
    const tab = notification.target_tab || TAB_BY_TYPE[notification.type] || 'notifications';
    const route = notification.target_route || routeForRole(currentUser.role);
    const params = new URLSearchParams();
    params.set('tab', tab);
    const tp = notification.target_parameters || {};
    const conversationId = notification.conversation_id || tp.partner_id;
    if (conversationId) params.set('conversation', conversationId);
    if (notification.message_id) params.set('message', notification.message_id);
    if (notification.order_id) params.set('order', notification.order_id);
    if (notification.request_id) params.set('request', notification.request_id);
    if (notification.service_id) params.set('service', notification.service_id);
    if (notification.report_id) params.set('report', notification.report_id);
    if (notification.source_id && !params.has(notification.source_type || 'source')) params.set(notification.source_type || 'source', notification.source_id);
    const stamp = notificationDate();
    await patchNotification(notification.id, { opened_at: stamp, read: true, read_at: notification.read_at || stamp, dismissed_at: stamp });
    navigate(`${route}?${params.toString()}`);
    options.onNavigated?.();
  }, [navigate, patchNotification]);

  const groupNotifications = useCallback((items = notifications) => {
    const map = new Map();
    for (const n of items) {
      const key = n.group_key || (n.conversation_id ? `conversation:${n.conversation_id}` : `${n.source_type || n.type}:${n.source_id || n.type}`);
      const group = map.get(key) || { key, items: [], latest: n, unreadCount: 0 };
      group.items.push(n);
      if (new Date(n.created_date || 0) > new Date(group.latest.created_date || 0)) group.latest = n;
      if (!n.read && !n.read_at) group.unreadCount += 1;
      map.set(key, group);
    }
    return Array.from(map.values()).map(g => ({ ...g, items: g.items.sort((a,b) => new Date(b.created_date) - new Date(a.created_date)) })).sort((a,b) => new Date(b.latest.created_date) - new Date(a.latest.created_date));
  }, [notifications]);

  const value = useMemo(() => ({
    notifications, unreadNotifications, unreadCount: unreadNotifications.length, loading,
    loadNotifications, addLocalNotification, getUnreadCountForTab, getUnreadCountForConversation,
    markNotificationRead, markNotificationsForSourceRead, markConversationNotificationsRead,
    markNotificationsForServiceRead, markNotificationsForOrderRead, markNotificationsForGuestMessageRead,
    markTabLevelNotificationsRead, dismissNotification, markAllRead,
    navigateFromNotification, groupNotifications,
  }), [notifications, unreadNotifications, loading, loadNotifications, addLocalNotification, getUnreadCountForTab, getUnreadCountForConversation, markNotificationRead, markNotificationsForSourceRead, markConversationNotificationsRead, markNotificationsForServiceRead, markNotificationsForOrderRead, markNotificationsForGuestMessageRead, markTabLevelNotificationsRead, dismissNotification, markAllRead, navigateFromNotification, groupNotifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
