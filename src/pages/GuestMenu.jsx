import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import MenuBrowser from '@/components/MenuBrowser';
import GuestChat from '@/components/GuestChat';
import { Scissors, Coffee, MessageCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [view, setView] = useState('choice');
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [salonName, setSalonName] = useState('Salonflow');
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const salonId = urlParams.get('salon');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setGuestInfo(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.SalonSetting.filter(salonId ? { salon_id: salonId } : {});
      if (data.length > 0 && data[0].salon_name) {
        setSalonName(data[0].salon_name);
      }
    };
    load();
    const unsubscribe = base44.entities.SalonSetting.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        if (salonId && event.data.salon_id !== salonId) return;
        setSalonName(event.data.salon_name || 'Salonflow');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!guestInfo?.session) return;
    const load = async () => {
      try {
        const response = await base44.functions.invoke('getGuestOrders', {
          salon_id: salonId,
          guest_session: guestInfo.session
        });
        setOrders(response.data.orders || []);
      } catch (e) {
        setOrders([]);
      }
    };
    load();
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' && event.data.guest_session === guestInfo.session && event.data.salon_id === salonId) {
        setOrders(prev => [event.data, ...prev]);
      } else if (event.type === 'update' && event.data.guest_session === guestInfo.session && event.data.salon_id === salonId) {
        setOrders(prev => prev.map(o => o.id === event.data.id ? event.data : o));
      }
    });
    return unsubscribe;
  }, [guestInfo?.session]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    const info = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      session: generateSession(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setGuestInfo(info);
    setView('choice');
  };

  if (!salonId) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
              <Scissors className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-xl font-semibold mb-2">Salon Not Found</h1>
            <p className="text-sm text-muted-foreground">Please scan the QR code at your salon to access the menu.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Name form
  if (!guestInfo) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                <Scissors className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-heading text-xl font-semibold">{salonName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Tell us who you are to get started.</p>
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required />
              </div>
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Choice screen
  if (view === 'choice') {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
              <Scissors className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-xl font-semibold">Welcome, {guestInfo.firstName}!</h1>
            <p className="text-sm text-muted-foreground mt-1">What would you like to do?</p>
          </div>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setView('menu'); }}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Coffee className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Browse Menu</h3>
                <p className="text-sm text-muted-foreground">Request drinks and refreshments</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setView('chat')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Chat with Front Desk</h3>
                <p className="text-sm text-muted-foreground">Live chat with our team</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3a: Live chat with front desk
  if (view === 'chat') {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="bg-background border-b sticky top-0 z-10 safe-area-top">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setView('choice')}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
            <span className="font-heading font-semibold">{salonName}</span>
            <div className="w-16" />
          </div>
        </header>
        <div className="flex-1 max-w-2xl mx-auto w-full">
          <GuestChat guestInfo={guestInfo} salonId={salonId} />
        </div>
      </div>
    );
  }

  // Step 3b: Menu browser
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10 safe-area-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView('choice')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">Hi, {guestInfo.firstName}</span>
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
        <MenuBrowser mode="guest" guestInfo={guestInfo} salonId={salonId} />
      </div>
    </div>
  );
}