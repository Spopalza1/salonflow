import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Coffee, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Image as UIImage } from '@/components/ui/image';
import { cn } from '@/lib/utils';
import ItemCustomizationDialog from '@/components/ItemCustomizationDialog';

export default function MenuBrowser({ mode, user, guestInfo, salonId }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);
  const [customItem, setCustomItem] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const sectionRefs = useRef({});
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const itemFilter = salonId ? { available: true, salon_id: salonId } : { available: true };
      const catFilter = salonId ? { salon_id: salonId } : {};
      const [data, cats, groups] = await Promise.all([
        base44.entities.MenuItem.filter(itemFilter, 'display_order'),
        base44.entities.MenuCategory.filter(catFilter, 'display_order'),
        base44.entities.MenuItemOptionGroup.filter(salonId ? { salon_id: salonId } : {})
      ]);
      setItems(data);
      setCategories(cats);
      setOptionGroups(groups);
      setLoading(false);
    };
    load();

    const unsubItems = base44.entities.MenuItem.subscribe((event) => {
      if (event.type === 'create') {
        if (salonId && event.data.salon_id !== salonId) return;
        if (event.data.available) setItems(prev => [...prev, event.data].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } else if (event.type === 'update') {
        setItems(prev => prev.map(i => i.id === event.data.id ? event.data : i).filter(i => i.available).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(i => i.id !== event.id));
      }
    });

    const unsubCats = base44.entities.MenuCategory.subscribe((event) => {
      if (event.type === 'create') {
        if (salonId && event.data.salon_id !== salonId) return;
        setCategories(prev => [...prev, event.data]);
      }
      else if (event.type === 'update') setCategories(prev => prev.map(c => c.id === event.data.id ? event.data : c));
      else if (event.type === 'delete') setCategories(prev => prev.filter(c => c.id !== event.id));
    });

    const unsubGroups = base44.entities.MenuItemOptionGroup.subscribe((event) => {
      if (salonId && event.data?.salon_id !== salonId) return;
      if (event.type === 'create') setOptionGroups(prev => [...prev, event.data]);
      else if (event.type === 'update') setOptionGroups(prev => prev.map(g => g.id === event.data.id ? event.data : g));
      else if (event.type === 'delete') setOptionGroups(prev => prev.filter(g => g.id !== event.id));
    });

    return () => { unsubItems(); unsubCats(); unsubGroups(); };
  }, []);

  const categoryOrder = categories.map(c => c.name);
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  const sortedCategoryNames = Object.keys(grouped).sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  useEffect(() => {
    if (sortedCategoryNames.length === 0) return;
    if (!activeCategory) setActiveCategory(sortedCategoryNames[0]);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.dataset.category);
          }
        });
      },
      { rootMargin: '-15% 0px -75% 0px' }
    );
    sortedCategoryNames.forEach((cat) => {
      const el = sectionRefs.current[cat];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sortedCategoryNames.join(',')]);

  const complimentarySet = new Set(categories.filter(c => c.complimentary).map(c => c.name));

  const itemOptionGroups = (itemId) => optionGroups.filter(g => g.menu_item_id === itemId);

  const scrollToCategory = (category) => {
    setActiveCategory(category);
    sectionRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOrder = async (item) => {
    const groups = itemOptionGroups(item.id);
    if (groups.length > 0) {
      setCustomItem(item);
      setCustomOpen(true);
      return;
    }
    await submitOrder(item, null, item.price);
  };

  const submitOrder = async (item, customizations, adjustedPrice) => {
    setOrdering(item.id);
    try {
      const isComplimentary = complimentarySet.has(item.category) || item.complimentary;
      const orderData = {
        item_name: item.name,
        category: item.category,
        price: isComplimentary ? null : (adjustedPrice != null ? adjustedPrice : item.price),
        status: 'pending',
        salon_id: salonId,
      };
      if (customizations) orderData.customizations = customizations;
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

  const handleCustomConfirm = (customizations, adjustedPrice) => {
    const isComplimentary = customItem && (complimentarySet.has(customItem.category) || customItem.complimentary);
    submitOrder(customItem, customizations, isComplimentary ? null : adjustedPrice);
    setCustomOpen(false);
  };

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
    <div className="flex gap-6 md:gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-48 lg:w-56 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 p-3 rounded-xl glass-card">
          <nav className="space-y-0.5">
            {sortedCategoryNames.map(category => (
              <button
                key={category}
                onClick={() => scrollToCategory(category)}
                className={cn(
                  "block w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeCategory === category
                    ? "font-semibold text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {category}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile category pills */}
        <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex gap-2 pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {sortedCategoryNames.map(category => (
              <button
                key={category}
                onClick={() => scrollToCategory(category)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "glass-card text-muted-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {sortedCategoryNames.map(category => {
          const categoryItems = grouped[category];
          const isComplimentary = complimentarySet.has(category);
          return (
            <section
              key={category}
              data-category={category}
              ref={el => sectionRefs.current[category] = el}
              className="mb-10 scroll-mt-20"
            >
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-heading text-xl md:text-2xl font-bold">{category}</h2>
                {isComplimentary && <Badge variant="secondary" className="text-xs"><Gift className="w-3 h-3 mr-1" />Complimentary</Badge>}
              </div>
              <hr className="border-border mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                {categoryItems.map(item => {
                  const itemIsComp = isComplimentary || item.complimentary;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleOrder(item)}
                      disabled={ordering === item.id}
                      className="group flex flex-col items-center text-center"
                    >
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden bg-muted mb-3 ring-1 ring-border group-hover:ring-2 group-hover:ring-primary group-active:scale-95 transition-all">
                        {item.image_url ? (
                          <UIImage src={item.image_url} alt={item.name} className="w-full h-full" fittingType="fill" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Coffee className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {ordering === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium leading-tight line-clamp-2">{item.name}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {itemIsComp ? 'Complimentary' : item.price != null ? `$${item.price.toFixed(2)}` : ''}
                      </span>
                      {itemOptionGroups(item.id).length > 0 && (
                        <span className="text-[10px] text-muted-foreground/70 mt-0.5">Customizable</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {customItem && (
        <ItemCustomizationDialog
          item={customItem}
          optionGroups={itemOptionGroups(customItem.id)}
          open={customOpen}
          onOpenChange={setCustomOpen}
          onConfirm={handleCustomConfirm}
          basePrice={customItem.complimentary || complimentarySet.has(customItem.category) ? 0 : customItem.price}
        />
      )}
    </div>
  );
}