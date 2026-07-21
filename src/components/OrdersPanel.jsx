import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Coffee, Utensils, Check, X } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'destructive' },
  preparing: { label: 'Preparing', variant: 'secondary' },
  served: { label: 'Served', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChairTable, setShowChairTable] = useState(() => {
    const saved = localStorage.getItem('salonflow_show_chair_table');
    return saved !== null ? saved === 'true' : true;
  });
  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.Order.filter({}, '-created_date', 100);
      setOrders(data);
      setLoading(false);
    };
    load();

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') {
        setOrders(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setOrders(prev => prev.map(o => o.id === event.data.id ? event.data : o));
      } else if (event.type === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const updateStatus = async (order, status) => {
    try {
      await base44.entities.Order.update(order.id, { status });
    } catch (err) {
      console.error(err);
    }
  };

  const statusOrder = { pending: 0, preparing: 1, served: 2, cancelled: 3 };
  const sorted = [...orders].sort((a, b) =>
    (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || new Date(b.created_date) - new Date(a.created_date)
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-xl font-semibold">Orders & Requests</h2>
          {pendingCount > 0 && <Badge variant="destructive">{pendingCount} new</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-chair" checked={showChairTable} onCheckedChange={(checked) => { setShowChairTable(checked); localStorage.setItem('salonflow_show_chair_table', String(checked)); }} />
          <Label htmlFor="show-chair" className="text-sm text-muted-foreground cursor-pointer">Chair/Table</Label>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(order => (
            <Card key={order.id} className={order.status === 'pending' ? 'border-destructive/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">{order.item_name}</div>
                    <div className="text-sm text-muted-foreground">{order.category}</div>
                  </div>
                  <Badge variant={STATUS_CONFIG[order.status]?.variant}>{STATUS_CONFIG[order.status]?.label}</Badge>
                </div>
                <div className="text-sm space-y-0.5 mb-3">
                  <div>From: <span className="font-medium">{order.requested_by_name}</span></div>
                  <div>Type: <Badge variant="outline" className="capitalize text-xs">{order.requested_by_type}</Badge></div>
                  {showChairTable && order.chair_table && <div>Chair/Table: {order.chair_table}</div>}
                  {order.notes && <div className="text-muted-foreground">Note: {order.notes}</div>}
                </div>
                <div className="flex gap-1">
                  {order.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(order, 'preparing')}><Utensils className="w-3 h-3 mr-1" />Start</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order, 'served')}><Check className="w-3 h-3 mr-1" />Serve</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(order, 'cancelled')}><X className="w-3 h-3" /></Button>
                    </>
                  )}
                  {order.status === 'preparing' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(order, 'served')}><Check className="w-3 h-3 mr-1" />Serve</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(order, 'cancelled')}><X className="w-3 h-3" /></Button>
                    </>
                  )}
                  {(order.status === 'served' || order.status === 'cancelled') && (
                    <Badge variant="outline" className="ml-auto">{STATUS_CONFIG[order.status]?.label}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}