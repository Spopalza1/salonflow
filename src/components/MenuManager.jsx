import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Coffee } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function MenuManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '', available: true });

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.MenuItem.list('display_order');
      setItems(data);
      setLoading(false);
    };
    load();
    const unsubscribe = base44.entities.MenuItem.subscribe((event) => {
      if (event.type === 'create') {
        setItems(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setItems(prev => prev.map(i => i.id === event.data.id ? event.data : i));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(i => i.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const existingCategories = [...new Set(items.map(i => i.category).filter(Boolean))];

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: '', price: '', description: '', available: true });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price?.toString() || '',
      description: item.description || '',
      available: item.available,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      price: form.price ? parseFloat(form.price) : null,
      description: form.description,
      available: form.available,
    };
    try {
      if (editing) {
        await base44.entities.MenuItem.update(editing.id, payload);
        toast({ title: 'Item updated' });
      } else {
        await base44.entities.MenuItem.create(payload);
        toast({ title: 'Item added' });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await base44.entities.MenuItem.delete(item.id);
      toast({ title: 'Item deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const categories = {};
  items.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Manage your menu items and categories.</p>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No menu items yet. Add your first item!</p>
        </div>
      ) : (
        Object.entries(categories).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="font-heading text-lg font-semibold mb-2">{category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {!item.available && <Badge variant="destructive">Hidden</Badge>}
                        </div>
                        {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                        {item.price != null && <p className="text-sm font-medium mt-1">${item.price.toFixed(2)}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cappuccino" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" list="categories-list" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Coffee" required />
              <datalist id="categories-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="3.50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Rich espresso with steamed milk" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="available" checked={form.available} onCheckedChange={v => setForm({ ...form, available: v })} />
              <Label htmlFor="available">Available on menu</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}