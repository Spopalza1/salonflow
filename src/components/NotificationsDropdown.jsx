import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const targetRole = user?.role === 'admin' ? 'admin' : 'stylist';

  useEffect(() => {
    if (!user?.salon_id) return;
    const load = async () => {
      const data = await base44.entities.Notification.filter(
        { salon_id: user.salon_id, target_role: targetRole },
        '-created_date',
        50
      );
      setNotifications(data);
    };
    load();

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.data.target_role !== targetRole) return;
      if (event.type === 'create') {
        setNotifications(prev => {
          if (prev.some(n => n.id === event.data.id)) return prev;
          return [event.data, ...prev].slice(0, 50);
        });
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.data.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return unsubscribe;
  }, [user?.id, user?.salon_id, targetRole]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await base44.entities.Notification.updateMany(
        { salon_id: user.salon_id, read: false, target_role: targetRole },
        { $set: { read: true } }
      );
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, read: false })));
    }
  };

  const clearRead = async () => {
    setNotifications(prev => prev.filter(n => !n.read));
    try {
      await base44.entities.Notification.deleteMany({ read: true, salon_id: user.salon_id, target_role: targetRole });
    } catch (err) {
      // ignore - already removed from local state
    }
  };

  const ADMIN_TAB_MAP = {
    order: 'orders',
    service: 'services',
    service_note: 'services',
    guest_message: 'messages',
    chat: 'chat',
    service_update: 'services',
  };

  const handleNotificationClick = async (n) => {
    if (targetRole === 'admin') {
      const tab = ADMIN_TAB_MAP[n.type];
      if (tab) navigate(`/front-desk?tab=${tab}`);
    } else {
      navigate(`/stylist?tab=chat`);
    }
    if (!n.read) {
      try {
        await base44.entities.Notification.update(n.id, { read: true });
      } catch (e) { /* already deleted */ }
    }
    setOpen(false);
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const hasRead = notifications.some(n => n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px] touch-target">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="glass-panel w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-0 rounded-3xl overflow-hidden duration-200 motion-reduce:duration-0"
        align="end"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <span className="font-heading font-semibold text-sm">Notifications</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring"
                onClick={markAllRead}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            {hasRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive bg-destructive/5 hover:bg-destructive/15 hover:text-destructive focus-visible:ring-1 focus-visible:ring-destructive/30 disabled:opacity-40 disabled:pointer-events-none"
                onClick={clearRead}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(n); } }}
                className={`px-4 py-3 border-b border-border/15 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:bg-muted/30 ${!n.read ? 'bg-primary/[0.04]' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTime(n.created_date)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}