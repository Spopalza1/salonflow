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
import { Plus, Pencil, Trash2, Coffee, FolderPlus, Gift, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Image as UIImage } from '@/components/ui/image';

export default function MenuManager() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', id: null });
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '', image_url: '', available: true });
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, image_url: file_url }));
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const [itemData, catData] = await Promise.all([
        base44.entities.MenuItem.list('display_order'),
        base44.entities.MenuCategory.list('display_order')
      ]);
      setItems(itemData);
      setCategories(catData);
      setLoading(false);
    };
    load();

    const unsubItems = base44.entities.MenuItem.subscribe((event) => {
      if (event.type === 'create') setItems(prev => [...prev, event.data]);
      else if (event.type === 'update') setItems(prev => prev.map(i => i.id === event.data.id ? event.data : i));
      else if (event.type === 'delete') setItems(prev => prev.filter(i => i.id !== event.id));
    });

    const unsubCats = base44.entities.MenuCategory.subscribe((event) => {
      if (event.type === 'create') setCategories(prev => [...prev, event.data]);
      else if (event.type === 'update') setCategories(prev => prev.map(c => c.id === event.data.id ? event.data : c));
      else if (event.type === 'delete') setCategories(prev => prev.filter(c => c.id !== event.id));
    });

    return () => { unsubItems(); unsubCats(); };
  }, []);

  const existingCategoryNames = categories.map(c => c.name);
  const complimentarySet = new Set(categories.filter(c => c.complimentary).map(c => c.name));

  // Item dialog handlers
  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: existingCategoryNames[0] || '', price: '', description: '', image_url: '', available: true });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price?.toString() || '',
      description: item.description || '',
      image_url: item.image_url || '',
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
      image_url: form.image_url || null,
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

  // Category handlers
  const openAddCategory = () => {
    setCatForm({ name: '', id: null });
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat) => {
    setCatForm({ name: cat.name, id: cat.id });
    setCatDialogOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        const oldCat = categories.find(c => c.id === catForm.id);
        const oldName = oldCat.name;
        await base44.entities.MenuCategory.update(catForm.id, { name: catForm.name });
        // Update all items with the old category name
        const itemsToUpdate = items.filter(i => i.category === oldName);
        if (itemsToUpdate.length > 0) {
          await base44.entities.MenuItem.bulkUpdate(itemsToUpdate.map(i => ({ id: i.id, category: catForm.name })));
        }
        toast({ title: 'Category renamed' });
      } else {
        await base44.entities.MenuCategory.create({ name: catForm.name, complimentary: false, display_order: categories.length });
        toast({ title: 'Category created' });
      }
      setCatDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleComplimentary = async (cat) => {
    try {
      await base44.entities.MenuCategory.update(cat.id, { complimentary: !cat.complimentary });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Items will remain but lose their category grouping.`)) return;
    try {
      await base44.entities.MenuCategory.delete(cat.id);
      toast({ title: 'Category deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Group items by category
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="space-y-6">
      {/* Category Management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg font-semibold">Categories</h3>
          <Button variant="outline" size="sm" onClick={openAddCategory}><FolderPlus className="w-4 h-4 mr-2" />New Category</Button>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet. Create one to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                <button onClick={() => openEditCategory(cat)} className="text-sm font-medium hover:underline">{cat.name}</button>
                {cat.complimentary && <Badge variant="default" className="text-xs"><Gift className="w-3 h-3 mr-1" />Free</Badge>}
                <div className="flex items-center gap-1.5">
                  <Switch checked={cat.complimentary} onCheckedChange={() => toggleComplimentary(cat)} />
                  <Label className="text-xs text-muted-foreground">Complimentary</Label>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(cat)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t" />

      {/* Item Management */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Menu items</p>
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
        Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-heading text-lg font-semibold">{category}</h3>
              {complimentarySet.has(category) && <Badge variant="default"><Gift className="w-3 h-3 mr-1" />Complimentary</Badge>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    {item.image_url && (
                      <UIImage src={item.image_url} alt={item.name} className="w-full h-32 rounded-lg object-cover mb-3" fittingType="fill" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {!item.available && <Badge variant="destructive">Hidden</Badge>}
                        </div>
                        {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                        {complimentarySet.has(category)
                          ? <p className="text-sm font-medium mt-1 text-green-600">Complimentary</p>
                          : item.price != null && <p className="text-sm font-medium mt-1">${item.price.toFixed(2)}</p>}
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

      {/* Item Dialog */}
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
                {existingCategoryNames.map(c => <option key={c} value={c} />)}
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
            <div className="space-y-2">
              <Label>Item Picture</Label>
              {form.image_url ? (
                <div className="relative">
                  <UIImage src={form.image_url} alt="Item preview" className="w-full h-40 rounded-lg" fittingType="fill" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setForm({ ...form, image_url: '' })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  {uploading && <span className="text-sm text-muted-foreground shrink-0">Uploading...</span>}
                </div>
              )}
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

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catForm.id ? 'Rename Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input id="cat-name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Coffee" required autoFocus />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{catForm.id ? 'Save' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}