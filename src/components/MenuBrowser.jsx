import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coffee, Plus, Check, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Image as UIImage } from '@/components/ui/image';

export default function MenuBrowser({ mode, user, guestInfo, salonId }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const itemFilter = salonId ? { available: true, salon_id: salonId } : { available: true };
      const catFilter = salonId ? { salon_id: salonId } : {};
      const [data, cats] = await Promise.all([
        base44.entities.MenuItem.filter(itemFilter, 'display_order'),
        base44.entities.MenuCategory.filter(catFilter, 'display_order')
      ]);
      setItems(data);
      setCategories(cats);
      setLoading(false);
    };
    load();

    const unsubItems = base44.entities.MenuItem.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data.available) setItems(prev => [...prev, event.data].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } else if (event.type === 'update') {
        setItems(prev => prev.map(i => i.id === event.data.id ? event.data : i).filter(i => i.available).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(i => i.id !== event.id));
      }
    });

    const unsubCats = base44.entities.MenuCategory.subscribe((event) => {
      if (event.type === 'create') setCategories(prev => [...prev, event.data]);
      else if (event.type === 'update') setCategories(prev => prev.map(c => c.id === event.data.id ? event.data : c));
      else if (event.type === 'delete') setCategories(prev => prev.filter(c => c.id !== event.id));
    });

    return () => { unsubItems(); unsubCats(); };
  }, []);

  const complimentarySet = new Set(categories.filter(c => c.complimentary).map(c => c.name));

  const handleOrder = async (item) => {
    setOrdering(item.id);
    try {
      const isComplimentary = complimentarySet.has(item.category);
      const orderData = {
        item_name: item.name,
        category: item.category,
        price: isComplimentary ? null : item.price,
        status: 'pending',
        salon_id: salonId,
      };
      if (mode === 'stylist') {
        orderData.requested_by_type = 'stylist';
        orderData.requested_by_name = user?.display_name || user?.full_name || user?.email || 'Stylist';
        orderData.requested_by_user_id = user?.id;
        if (user?.chair_number) {
          orderData.chair_table = user.chair_number;
        }
      } else {
        orderData.requested_by_type = 'guest';
        orderData.requested_by_name = guestInfo?.name || 'Guest';
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

  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
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
      {Object.entries(grouped).map(([category, categoryItems]) => {
        const isComplimentary = complimentarySet.has(category);
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-heading text-xl font-semibold">{category}</h2>
              {isComplimentary && <Badge variant="default"><Gift className="w-3 h-3 mr-1" />Complimentary</Badge>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryItems.map(item => (
                <Card key={item.id}>
                  {item.image_url && (
                    <UIImage src={item.image_url} alt={item.name} className="w-full h-36 rounded-t-lg" fittingType="fill" />
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{item.name}</span>
                      {isComplimentary
                        ? <Badge className="bg-green-600">Complimentary</Badge>
                        : item.price != null && <Badge variant="secondary">${item.price.toFixed(2)}</Badge>}
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
        );
      })}
    </div>
  );
}