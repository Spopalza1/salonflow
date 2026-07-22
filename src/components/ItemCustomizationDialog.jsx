import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export default function ItemCustomizationDialog({ item, optionGroups, open, onOpenChange, onConfirm, basePrice }) {
  const [selections, setSelections] = useState({});
  const [notes, setNotes] = useState('');

  // Reset selections when dialog opens for a new item
  const itemKey = item?.id;
  useEffect(() => {
    if (open) {
      setSelections({});
      setNotes('');
    }
  }, [itemKey, open]);

  const extraTotal = useMemo(() => {
    return Object.values(selections).flat().reduce((sum, o) => sum + (o.extra_price || 0), 0);
  }, [selections]);

  if (!item || !optionGroups || optionGroups.length === 0) return null;

  const handleSingleSelect = (groupId, option) => {
    setSelections(prev => ({ ...prev, [groupId]: [option] }));
  };

  const handleMultiToggle = (groupId, option) => {
    setSelections(prev => {
      const current = prev[groupId] || [];
      const exists = current.find(o => o.name === option.name);
      if (exists) {
        return { ...prev, [groupId]: current.filter(o => o.name !== option.name) };
      }
      return { ...prev, [groupId]: [...current, option] };
    });
  };

  const totalPrice = (basePrice || 0) + extraTotal;

  const canConfirm = optionGroups.every(g => {
    if (!g.required) return true;
    return (selections[g.id] || []).length > 0;
  });

  const handleConfirm = () => {
    const parts = [];
    optionGroups.forEach(g => {
      const selected = selections[g.id] || [];
      if (selected.length > 0) {
        parts.push(`${g.name}: ${selected.map(o => o.name).join(', ')}`);
      }
    });
    if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
    onConfirm(parts.join(' | '), totalPrice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Customize {item.name}</span>
            <Badge variant="secondary">${totalPrice.toFixed(2)}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {optionGroups.map(group => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-sm">{group.name}</Label>
                {group.required && <Badge variant="default" className="text-xs">Required</Badge>}
                {group.allow_multiple && <Badge variant="outline" className="text-xs">Choose multiple</Badge>}
              </div>
              {group.allow_multiple ? (
                <div className="space-y-2">
                  {(group.options || []).map(opt => {
                    const selected = (selections[group.id] || []).find(o => o.name === opt.name);
                    return (
                      <label key={opt.name} className="flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={!!selected} onCheckedChange={() => handleMultiToggle(group.id, opt)} />
                          <span className="text-sm">{opt.name}</span>
                        </div>
                        {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={(selections[group.id] || [])[0]?.name || ''}
                  onValueChange={(val) => {
                    const opt = (group.options || []).find(o => o.name === val);
                    if (opt) handleSingleSelect(group.id, opt);
                  }}
                >
                  {(group.options || []).map(opt => (
                    <label key={opt.name} className="flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={opt.name} id={`${group.id}-${opt.name}`} />
                        <span className="text-sm">{opt.name}</span>
                      </div>
                      {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="cust-notes">Special Instructions</Label>
            <textarea
              id="cust-notes"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="No sugar, extra hot, etc."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {canConfirm ? `Add · $${totalPrice.toFixed(2)}` : 'Select required'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}