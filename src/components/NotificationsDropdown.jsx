import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, CheckCheck, MessageSquare, ClipboardList, Scissors, Mail, FileText, X, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotifications } from '@/lib/NotificationContext';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const ICONS = {
  chat: MessageSquare, chat_message: MessageSquare,
  order: ClipboardList, order_created: ClipboardList, order_update: ClipboardList,
  service: Scissors, service_request: Scissors, service_note: Scissors, service_update: Scissors,
  guest_message: Mail, report_ready: FileText,
};

const formatTime = (dateStr) => {
  const time = new Date(dateStr).getTime();
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return new Date(dateStr).toLocaleDateString([], { weekday: 'long' });
  return new Date(dateStr).toLocaleDateString();
};

function NotificationRow({ notification, onOpen, onDismiss }) {
  const Icon = ICONS[notification.type] || Bell;
  const unread = !notification.read && !notification.read_at;
  return (
    <motion.div layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
      className={cn('sf-notification-row group', unread && 'sf-notification-unread', notification.priority === 'critical' && 'sf-notification-critical')}
    >
      <button type="button" onClick={() => onOpen(notification)} className="flex flex-1 min-w-0 items-start gap-3 text-left focus-visible:outline-none">
        <span className="sf-notification-icon"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold leading-snug line-clamp-1">{notification.title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(notification.created_date)}</span>
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground line-clamp-2">{notification.body}</span>
        </span>
      </button>
      <button type="button" onClick={() => onDismiss(notification.id)} aria-label="Dismiss notification" className="sf-notification-dismiss"><X className="h-3.5 w-3.5" /></button>
    </motion.div>
  );
}

function NotificationGroup({ group, onOpen, onDismiss, onDismissGroup }) {
  const [expanded, setExpanded] = useState(false);
  const latest = group.latest;
  const Icon = ICONS[latest.type] || Bell;
  const grouped = group.items.length > 1;

  if (!grouped) {
    return <NotificationRow notification={latest} onOpen={onOpen} onDismiss={onDismiss} />;
  }

  // Once opened, the visual stack disappears and is replaced by the actual
  // individual notifications, matching the iPhone notification behaviour.
  if (expanded) {
    return (
      <motion.section layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center justify-end px-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onDismissGroup(group)} className="h-8 rounded-lg text-xs text-muted-foreground hover:text-destructive">
            <X className="mr-1 h-3.5 w-3.5" /> Clear stack
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {group.items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onOpen={onOpen} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </motion.section>
    );
  }

  return (
    <motion.section layout className="sf-notification-stack group/stack">
      <button type="button" onClick={() => setExpanded(true)} className="sf-notification-stack-header" aria-expanded="false">
        <span className="sf-notification-stack-layer sf-layer-2" />
        <span className="sf-notification-stack-layer sf-layer-1" />
        <span className="relative z-10 flex w-full items-start gap-3 rounded-[inherit]">
          <span className="sf-notification-icon"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold line-clamp-1">{latest.title}</span><span className="text-[10px] text-muted-foreground">{formatTime(latest.created_date)}</span></span>
            <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">{latest.body}</span>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{group.items.length} notifications{group.unreadCount ? ` · ${group.unreadCount} unread` : ''}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onDismissGroup(group); }}
        aria-label="Clear notification stack"
        title="Clear stack"
        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition hover:text-destructive group-hover/stack:opacity-100 focus:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.section>
  );
}

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const userRole = String(user?.role || user?.data?.role || '').toLowerCase();
  const isStylist = userRole === 'stylist' || userRole === 'user';
  const { notifications, unreadCount, markAllRead, dismissNotification, navigateFromNotification, groupNotifications, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => notifications.filter(n => {
    const effectiveFilter = isStylist ? 'all' : filter;
    const effectiveQuery = isStylist ? '' : query;
    const unread = !n.read && !n.read_at;
    const tab = n.target_tab || ({ chat_message: 'chat', chat: 'chat', order: 'orders', order_created: 'orders', order_update: 'orders', service: 'services', service_request: 'services', service_update: 'services', guest_message: 'messages', report_ready: 'report' }[n.type]);
    if (effectiveFilter === 'unread' && !unread) return false;
    if (!['all', 'unread'].includes(effectiveFilter) && tab !== effectiveFilter) return false;
    const needle = effectiveQuery.trim().toLowerCase();
    return !needle || `${n.title || ''} ${n.body || ''}`.toLowerCase().includes(needle);
  }), [notifications, filter, query, isStylist]);
  const groups = useMemo(() => {
    if (!isStylist) return groupNotifications(filtered);

    // Stylists see one unified centre grouped by the origin of each alert
    // (front desk conversation, service, order, system), rather than the
    // admin-oriented destination tab layout.
    const originGroups = new Map();
    filtered.forEach((notification) => {
      const origin = notification.conversation_id
        ? `front-desk:${notification.conversation_id}`
        : notification.sender_user_id
          ? `sender:${notification.sender_user_id}`
          : `${notification.source_type || notification.type}:${notification.source_id || notification.type}`;
      const current = originGroups.get(origin) || { key: origin, items: [], latest: notification, unreadCount: 0 };
      current.items.push(notification);
      if (new Date(notification.created_date || 0) > new Date(current.latest.created_date || 0)) current.latest = notification;
      if (!notification.read && !notification.read_at) current.unreadCount += 1;
      originGroups.set(origin, current);
    });
    return Array.from(originGroups.values())
      .map(group => ({ ...group, items: group.items.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)) }))
      .sort((a, b) => new Date(b.latest.created_date || 0) - new Date(a.latest.created_date || 0));
  }, [filtered, groupNotifications, isStylist]);
  const handleOpen = async (notification) => { await navigateFromNotification(notification, { onNavigated: () => setOpen(false) }); };
  const handleDismissGroup = async (group) => {
    await Promise.allSettled(group.items.map((notification) => dismissNotification(notification.id)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} className="relative min-h-[44px] min-w-[44px] rounded-xl">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="sf-unread-badge absolute right-1 top-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="glass-panel relative w-[min(94vw,430px)] overflow-hidden rounded-[28px] border p-0">
        <div className="border-b border-border/20 px-4 py-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-base font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p></div>{unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllRead} className="rounded-xl"><CheckCheck className="mr-1.5 h-4 w-4" />Read all</Button>}</div>
          {isStylist ? (
            <p className="mt-3 text-xs text-muted-foreground">All alerts are grouped into stacks by where they came from.</p>
          ) : (
            <>
              <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notifications" className="h-9 rounded-xl pl-8" /></div>
              <div className="chat-scroll mt-3 flex gap-2 overflow-x-auto pb-1">{[['all','All'],['unread','Unread'],['chat','Chat'],['orders','Orders'],['services','Services'],['messages','Messages'],['report','Reports']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={cn('sf-filter-pill shrink-0', filter === value && 'is-active')}>{label}</button>)}</div>
            </>
          )}
        </div>
        <div className="chat-scroll max-h-[min(70vh,600px)] overflow-y-auto p-3">
          {loading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading notifications…</div> : groups.length === 0 ? <div className="py-14 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-3 h-9 w-9 opacity-30" />No notifications here</div> : <div className="space-y-3"><AnimatePresence initial={false}>{groups.map(group => <NotificationGroup key={group.key} group={group} onOpen={handleOpen} onDismiss={dismissNotification} onDismissGroup={handleDismissGroup} />)}</AnimatePresence></div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
