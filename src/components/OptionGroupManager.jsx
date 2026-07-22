import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function OptionGroupManager({ menuItemId, salonId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!menuItemId) return;
    const load = async () => {
      try {
        const data = await base44.entities.MenuItemOptionGroup.filter({ menu_item_id: menuItemId });
        setGroups(data);
      } catch (err) {
        toast({ title: 'Error loading options', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();

    const unsub = base44.entities.MenuItemOptionGroup.subscribe((event) => {
      if (event.data?.menu_item_id !== menuItemId) return;
      if (event.type === 'create') setGroups(prev => [...prev, event.data]);
      else if (event.type === 'update') setGroups(prev => prev.map(g => g.id === event.data.id ? event.data : g));
      else if (event.type === 'delete') setGroups(prev => prev.filter(g => g.id !== event.id));
    });

    return () => unsub();
  }, [menuItemId]);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await base44.entities.MenuItemOptionGroup.create({
        name: newGroupName.trim(),
        options: [],
        required: false,
        allow_multiple: false,
        menu_item_id: menuItemId,
        salon_id: salonId,
      });
      setNewGroupName('');
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateGroup = async (group, changes) => {
    try {
      await base44.entities.MenuItemOptionGroup.update(group.id, changes);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteGroup = async (group) => {
    if (!confirm(`Delete option group "${group.name}"?`)) return;
    try {
      await base44.entities.MenuItemOptionGroup.delete(group.id);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const addOption = async (group, name, price) => {
    if (!name.trim()) return;
    const newOption = { name: name.trim(), extra_price: price ? parseFloat(price) : 0 };
    const updatedOptions = [...(group.options || []), newOption];
    await updateGroup(group, { options: updatedOptions });
  };

  const removeOption = async (group, optName) => {
    const updatedOptions = (group.options || []).filter(o => o.name !== optName);
    await updateGroup(group, { options: updatedOptions });
  };

  const toggleExpanded = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading options...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          placeholder="New option group (e.g. Milk, Sugar, Decaf)"
          className="text-sm"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGroup(); } }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addGroup}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground">No option groups yet. Add one to allow customization.</p>
      )}

      {groups.map(group => (
        <OptionGroupCard
          key={group.id}
          group={group}
          expanded={expandedId === group.id}
          onToggle={() => toggleExpanded(group.id)}
          onUpdate={(changes) => updateGroup(group, changes)}
          onDelete={() => deleteGroup(group)}
          onAddOption={(name, price) => addOption(group, name, price)}
          onRemoveOption={(optName) => removeOption(group, optName)}
        />
      ))}
    </div>
  );
}

function OptionGroupCard({ group, expanded, onToggle, onUpdate, onDelete, onAddOption, onRemoveOption }) {
  const [optName, setOptName] = useState('');
  const [optPrice, setOptPrice] = useState('');

  const handleAdd = () => {
    if (!optName.trim()) return;
    onAddOption(optName, optPrice);
    setOptName('');
    setOptPrice('');
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-3">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="text-sm font-medium">{group.name}</span>
          <Badge variant="outline" className="text-xs">{(group.options || []).length} options</Badge>
          {group.required && <Badge variant="default" className="text-xs">Required</Badge>}
          {group.allow_multiple && <Badge variant="secondary" className="text-xs">Multi</Badge>}
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={group.required || false}
                onCheckedChange={v => onUpdate({ required: v })}
              />
              <Label className="text-xs">Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={group.allow_multiple || false}
                onCheckedChange={v => onUpdate({ allow_multiple: v })}
              />
              <Label className="text-xs">Allow multiple</Label>
            </div>
          </div>
          <div className="space-y-1">
            {(group.options || []).map(opt => (
              <div key={opt.name} className="flex items-center justify-between py-1 px-2 rounded hover:bg-accent">
                <span className="text-sm">{opt.name}</span>
                <div className="flex items-center gap-2">
                  {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
                  <button onClick={() => onRemoveOption(opt.name)} className="text-destructive hover:text-destructive/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={optName}
              onChange={e => setOptName(e.target.value)}
              placeholder="Option name"
              className="text-sm h-8"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <Input
              value={optPrice}
              onChange={e => setOptPrice(e.target.value)}
              placeholder="0.00"
              type="number"
              step="0.01"
              className="text-sm h-8 w-20"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleAdd}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}