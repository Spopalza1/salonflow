import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import MenuBrowser from '@/components/MenuBrowser';
import { Scissors, Coffee } from 'lucide-react';

const STORAGE_KEY = 'salonflow_guest';

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'destructive' },
  preparing: { label: 'Preparing', variant: 'secondary' },
  served: { label: 'Served', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

function generateSession() {
  return (crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
}

export default function GuestMenu() {
  const [guestInfo, setGuestInfo] = useState(null);
  const [name, setName] = useState('');
  const [chair, setChair] = useState('');
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [salonName, setSalonName] = useState('Salonflow');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setGuestInfo(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.SalonSetting.list();
      if (data.length > 0 && data[0].salon_name) {
        setSalonName(data[0].salon_name);
      }
    };
    load();
    const unsubscribe = base44.entities.SalonSetting.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        setSalonName(event.data.salon_name || 'Salonflow');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!guestInfo?.session) return;
    const load = async () => {
      const data = await base44.entities.Order.filter(
        { guest_session: guestInfo.session },
        '-created_date', 20
      );
      setOrders(data);
    };
    load();
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' && event.data.guest_session === guestInfo.session) {
        setOrders(prev => [event.data, ...prev]);
      } else if (event.type === 'update' && event.data.guest_session === guestInfo.session) {
        setOrders(prev => prev.map(o => o.id === event.data.id ? event.data : o));
      }
    });
    return unsubscribe;
  }, [guestInfo?.session]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const info = { name: name.trim(), chair: chair.trim(), session: generateSession() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setGuestInfo(info);
  };

  if (!guestInfo) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                <Scissors className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-heading text-xl font-semibold">Welcome!</h1>
              <p className="text-sm text-muted-foreground mt-1">Tell us who you are to browse the menu and request drinks.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gname">Your Name</Label>
                <Input id="gname" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gchair">Chair / Table Number</Label>
                <Input id="gchair" value={chair} onChange={e => setChair(e.target.value)} placeholder="Chair 3" />
              </div>
              <Button type="submit" className="w-full">Browse Menu</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-heading font-semibold">{salonName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">Hi, {guestInfo.name}</span>
            <Button variant="outline" size="sm" onClick={() => setShowOrders(!showOrders)}>
              <Coffee className="w-4 h-4 mr-2" />
              My Orders {orders.length > 0 && `(${orders.length})`}
            </Button>
          </div>
        </div>
      </header>

      {showOrders && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Your Requests</h3>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium text-sm">{o.item_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{new Date(o.created_date).toLocaleTimeString()}</span>
                      </div>
                      <Badge variant={STATUS_CONFIG[o.status]?.variant}>{STATUS_CONFIG[o.status]?.label}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        <MenuBrowser mode="guest" guestInfo={guestInfo} />
      </div>
    </div>
  );
}