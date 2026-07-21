import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coffee, Plus, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function MenuBrowser({ mode, user, guestInfo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.MenuItem.filter({ available: true }, 'display_order');
      setItems(data);
      setLoading(false);
    };
    load();
    const unsubscribe = base44.entities.MenuItem.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data.available) {
          setItems(prev => [...prev, event.data].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
        }
      } else if (event.type === 'update') {
        setItems(prev => {
          const updated = prev.map(i => i.id === event.data.id ? event.data : i);
          return updated.filter(i => i.available).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        });
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(i => i.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const handleOrder = async (item) => {
    setOrdering(item.id);
    try {
      const orderData = {
        item_name: item.name,
        category: item.category,
        price: item.price,
        status: 'pending',
      };
      if (mode === 'stylist') {
        orderData.requested_by_type = 'stylist';
        orderData.requested_by_name = user?.full_name || user?.email || 'Stylist';
        orderData.requested_by_user_id = user?.id;
      } else {
        orderData.requested_by_type = 'guest';
        orderData.requested_by_name = guestInfo?.name || 'Guest';
        orderData.chair_table = guestInfo?.chair || '';
        orderData.guest_session = guestInfo?.session || '';
      }
      await base44.entities.Order.create(orderData);
      toast({ title: 'Request sent!', description: `${item.name} request sent to front desk.` });
    } catch (err) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setOrdering(null);
    }
  };

  const categories = {};
  items.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No items on the menu yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(categories).map(([category, categoryItems]) => (
        <div key={category}>
          <h2 className="font-heading text-xl font-semibold mb-3">{category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map(item => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{item.name}</span>
                    {item.price != null && <Badge variant="secondary">${item.price.toFixed(2)}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {item.description && <p className="text-sm text-muted-foreground mb-3">{item.description}</p>}
                  <Button
                    className="w-full"
                    onClick={() => handleOrder(item)}
                    disabled={ordering === item.id}
                  >
                    {ordering === item.id
                      ? <><Check className="w-4 h-4 mr-2" />Sending...</>
                      : <><Plus className="w-4 h-4 mr-2" />Request</>}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}