import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Coffee, TrendingUp, Users, Utensils } from 'lucide-react';

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Strip extra fractional-second digits (DB returns 6, JS only handles 3)
  const cleaned = dateStr.replace(/\.(\d{3})\d*/, '.$1');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function isToday(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function formatTime(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function servedTime(order) {
  return order.updated_date || order.created_date;
}

export default function DailyReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.Order.filter({}, '-created_date', 500);
        setOrders(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        setOrders(prev => {
          const exists = prev.find(o => o.id === event.data.id);
          if (exists) return prev.map(o => o.id === event.data.id ? event.data : o);
          return [event.data, ...prev];
        });
      } else if (event.type === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== event.id));
      }
    });

    const interval = setInterval(load, 10000);

    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-center py-20 text-destructive"><p>Error loading report: {error}</p></div>;
  }

  const todaysOrders = orders.filter(o => o.status === 'served' && isToday(servedTime(o)));

  // Group by item name
  const itemMap = {};
  todaysOrders.forEach(o => {
    if (!itemMap[o.item_name]) {
      itemMap[o.item_name] = { name: o.item_name, count: 0, revenue: 0, category: o.category || 'Uncategorized' };
    }
    itemMap[o.item_name].count++;
    itemMap[o.item_name].revenue += o.price || 0;
  });
  const itemBreakdown = Object.values(itemMap).sort((a, b) => b.count - a.count);

  // Group by category
  const catMap = {};
  todaysOrders.forEach(o => {
    const cat = o.category || 'Uncategorized';
    if (!catMap[cat]) catMap[cat] = { name: cat, count: 0, revenue: 0 };
    catMap[cat].count++;
    catMap[cat].revenue += o.price || 0;
  });
  const categoryBreakdown = Object.values(catMap).sort((a, b) => b.count - a.count);

  // Group by person
  const personMap = {};
  todaysOrders.forEach(o => {
    const key = `${o.requested_by_name}__${o.requested_by_type}`;
    if (!personMap[key]) {
      personMap[key] = { name: o.requested_by_name, type: o.requested_by_type, count: 0, revenue: 0, items: {} };
    }
    personMap[key].count++;
    personMap[key].revenue += o.price || 0;
    const itemName = o.item_name;
    if (!personMap[key].items[itemName]) personMap[key].items[itemName] = 0;
    personMap[key].items[itemName]++;
  });
  const personBreakdown = Object.values(personMap).sort((a, b) => b.count - a.count);

  // Stats
  const totalItems = todaysOrders.length;
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const stylistCount = todaysOrders.filter(o => o.requested_by_type === 'stylist').length;
  const guestCount = todaysOrders.filter(o => o.requested_by_type === 'guest').length;

  const chartData = itemBreakdown.slice(0, 10).map(i => ({ name: i.name, count: i.count }));

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-xl font-semibold">Daily Report</h2>
        <Badge variant="secondary">{todayStr}</Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5"><Utensils className="w-5 h-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Items Served</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5"><TrendingUp className="w-5 h-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5"><Users className="w-5 h-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{stylistCount}</div>
              <div className="text-sm text-muted-foreground">Stylist Orders</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5"><Coffee className="w-5 h-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{guestCount}</div>
              <div className="text-sm text-muted-foreground">Guest Orders</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No items served today yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top Items Today</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {categoryBreakdown.map(cat => (
                <div key={cat.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="font-medium">{cat.name}</div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{cat.count} served</span>
                    <Badge variant="secondary">${cat.revenue.toFixed(2)}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* By Person Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Orders by Person</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {personBreakdown.map(person => (
                <div key={`${person.name}__${person.type}`} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{person.name}</span>
                      <Badge variant="outline" className="capitalize text-xs">{person.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{person.count} item{person.count !== 1 ? 's' : ''}</span>
                      <Badge variant="secondary">${person.revenue.toFixed(2)}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(person.items).map(([itemName, qty]) => (
                      <Badge key={itemName} variant="outline" className="text-xs">
                        {qty}× {itemName}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Item Breakdown Table */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Items Served Today</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-center">Qty</th>
                      <th className="pb-2 font-medium text-right">Price</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemBreakdown.map(item => (
                      <tr key={item.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{item.name}</td>
                        <td className="py-2.5 text-muted-foreground">{item.category}</td>
                        <td className="py-2.5 text-center">{item.count}</td>
                        <td className="py-2.5 text-right">${(item.revenue / item.count).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-medium">${item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="pt-3" colSpan={2}>Total</td>
                      <td className="pt-3 text-center">{totalItems}</td>
                      <td></td>
                      <td className="pt-3 text-right">${totalRevenue.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Served Orders */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Served Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {todaysOrders
                  .slice()
                  .sort((a, b) => (parseDate(servedTime(b))?.getTime() || 0) - (parseDate(servedTime(a))?.getTime() || 0))
                  .map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium">{o.item_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {o.requested_by_name} · <span className="capitalize">{o.requested_by_type}</span>
                        {o.chair_table ? ` · ${o.chair_table}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${(o.price || 0).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{formatTime(servedTime(o))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}