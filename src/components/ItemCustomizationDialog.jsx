import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Clock } from 'lucide-react';

import PreArrivalTimePicker from '@/components/prearrival/PreArrivalTimePicker';
export default function ItemCustomizationDialog({ item, optionGroups, open, onOpenChange, onConfirm, basePrice, preArrivalSettings, showRequirementBadges = true }) {
  const [selections, setSelections] = useState({});
  const [notes, setNotes] = useState('');
  const [preOrderMode, setPreOrderMode] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  const notesRef = useRef(null);

  const itemKey = item?.id;
  useEffect(() => {
    if (open) {
      const initial = {};
      (optionGroups || []).forEach(g => {
        if ((g.input_type || 'options') === 'number') {
          if (g.number_items && g.number_items.length > 0) {
            const obj = {};
            g.number_items.forEach((item, i) => { obj[i] = item.min ?? 0; });
            initial[g.id] = obj;
          } else {
            initial[g.id] = g.number_min ?? 0;
          }
        }
      });
      setSelections(initial);
      setNotes('');
      setPreOrderMode(false);
      setArrivalTime('');
      if (notesRef.current) notesRef.current.style.height = 'auto';
    }
  }, [itemKey, open]);

  const extraTotal = useMemo(() => {
    let total = 0;
    (optionGroups || []).forEach(g => {
      const val = selections[g.id];
      const type = g.input_type || 'options';
      if (type === 'options' && Array.isArray(val)) {
        total += val.reduce((s, o) => s + (o.extra_price || 0), 0);
      } else if (type === 'number') {
        if (g.number_items && g.number_items.length > 0 && typeof val === 'object') {
          g.number_items.forEach((item, i) => {
            total += (val[i] ?? item.min ?? 0) * (item.price_per_unit || 0);
          });
        } else if (typeof val === 'number') {
          total += val * (g.number_price_per_unit || 0);
        }
      } else if (type === 'yesno' && (val === 'yes' || val === 'no')) {
        total += val === 'yes' ? (g.yes_price || 0) : (g.no_price || 0);
      }
    });
    return total;
  }, [selections, optionGroups]);

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

  const setNumberValue = (groupId, value) => {
    setSelections(prev => ({ ...prev, [groupId]: value }));
  };

  const setNumberItemValue = (groupId, itemIndex, value) => {
    setSelections(prev => {
      const current = prev[groupId] || {};
      return { ...prev, [groupId]: { ...current, [itemIndex]: value } };
    });
  };

  const setYesNoValue = (groupId, value) => {
    setSelections(prev => ({ ...prev, [groupId]: value }));
  };

  const totalPrice = (basePrice || 0) + extraTotal;

  const canConfirm = optionGroups.every(g => {
    if (!g.required) return true;
    const val = selections[g.id];
    const type = g.input_type || 'options';
    if (type === 'options') return (val || []).length > 0;
    if (type === 'number') return val !== undefined && val !== null;
    if (type === 'yesno') return val === 'yes' || val === 'no';
    return true;
  });

  const handleConfirm = () => {
    const parts = [];
    optionGroups.forEach(g => {
      const val = selections[g.id];
      const type = g.input_type || 'options';
      if (type === 'options' && Array.isArray(val) && val.length > 0) {
        parts.push(`${g.name}: ${val.map(o => o.name).join(', ')}`);
      } else if (type === 'number') {
        if (g.number_items && g.number_items.length > 0 && typeof val === 'object') {
          g.number_items.forEach((item, i) => {
            const v = val[i] ?? item.min ?? 0;
            const unit = item.unit_label ? ` ${item.unit_label}` : '';
            parts.push(`${item.name || g.name}: ${v}${unit}`);
          });
        } else if (val !== undefined && val !== null) {
          const unit = g.number_unit ? ` ${g.number_unit}` : '';
          parts.push(`${g.name}: ${val}${unit}`);
        }
      } else if (type === 'yesno' && (val === 'yes' || val === 'no')) {
        const label = val === 'yes' ? (g.yes_label || 'Yes') : (g.no_label || 'No');
        parts.push(`${g.name}: ${label}`);
      }
    });
    if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
    onConfirm(parts.join(' | '), totalPrice, preOrderMode ? arrivalTime : null);
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const renderGroup = (group) => {
    const type = group.input_type || 'options';

    if (type === 'number') {
      if (group.number_items && group.number_items.length > 0) {
        const groupSel = selections[group.id] || {};
        return (
          <div className="space-y-2.5">
            {group.number_items.map((item, i) => {
              const min = item.min ?? 0;
              const max = item.max;
              const step = item.step ?? 1;
              const unit = item.unit_label;
              const pricePerUnit = item.price_per_unit || 0;
              const currentVal = groupSel[i] ?? min;

              const clamp = (v) => {
                if (v < min) return min;
                if (max !== undefined && max !== null && v > max) return max;
                return v;
              };

              return (
                <div key={i} className="flex items-center gap-2.5 min-h-[52px]">
                  <span className="text-sm font-medium flex-1 truncate">{item.name || `Item ${i + 1}`}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => setNumberItemValue(group.id, i, clamp(currentVal - step))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={currentVal}
                      min={min}
                      max={max}
                      step={step}
                      onChange={e => {
                        const v = e.target.value === '' ? min : parseFloat(e.target.value);
                        setNumberItemValue(group.id, i, isNaN(v) ? min : clamp(v));
                      }}
                      className="w-16 h-11 text-center"
                    />
                    <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => setNumberItemValue(group.id, i, clamp(currentVal + step))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {unit && <span className="text-xs text-muted-foreground shrink-0 w-10">{unit}</span>}
                  {pricePerUnit > 0 && (
                    <span className="text-sm text-muted-foreground shrink-0 w-16 text-right">+${(pricePerUnit * currentVal).toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      const min = group.number_min ?? 0;
      const max = group.number_max;
      const step = group.number_step ?? 1;
      const unit = group.number_unit;
      const pricePerUnit = group.number_price_per_unit || 0;
      const currentVal = selections[group.id] ?? min;

      const clamp = (v) => {
        if (v < min) return min;
        if (max !== undefined && max !== null && v > max) return max;
        return v;
      };

      return (
        <div className="flex items-center gap-2.5 min-h-[52px]">
          <div className="flex items-center gap-1.5 shrink-0">
            <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => setNumberValue(group.id, clamp(currentVal - step))}>
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              value={currentVal}
              min={min}
              max={max}
              step={step}
              onChange={e => {
                const v = e.target.value === '' ? min : parseFloat(e.target.value);
                setNumberValue(group.id, isNaN(v) ? min : clamp(v));
              }}
              className="w-16 h-11 text-center"
            />
            <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => setNumberValue(group.id, clamp(currentVal + step))}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {unit && <span className="text-sm text-muted-foreground shrink-0">{unit}</span>}
          {pricePerUnit > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">+${(pricePerUnit * currentVal).toFixed(2)}</span>
          )}
        </div>
      );
    }

    if (type === 'yesno') {
      const val = selections[group.id];
      return (
        <RadioGroup value={val || ''} onValueChange={v => setYesNoValue(group.id, v)} className="space-y-2.5">
          {[
            { value: 'yes', label: group.yes_label || 'Yes', price: group.yes_price || 0 },
            { value: 'no', label: group.no_label || 'No', price: group.no_price || 0 },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-center justify-between gap-3 min-h-[52px] px-3.5 rounded-xl border cursor-pointer transition-colors hover:bg-accent/40 ${val === opt.value ? 'border-primary/30 bg-primary/5' : 'border-border/30'}`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={`${group.id}-${opt.value}`} />
                <span className="text-sm">{opt.label}</span>
              </div>
              {opt.price > 0 && <span className="text-sm text-muted-foreground">+${opt.price.toFixed(2)}</span>}
            </label>
          ))}
        </RadioGroup>
      );
    }

    if (group.allow_multiple) {
      return (
        <div className="space-y-2.5">
          {(group.options || []).map(opt => {
            const selected = (selections[group.id] || []).find(o => o.name === opt.name);
            return (
              <label
                key={opt.name}
                className={`flex items-center justify-between gap-3 min-h-[52px] px-3.5 rounded-xl border cursor-pointer transition-colors hover:bg-accent/40 ${selected ? 'border-primary/30 bg-primary/5' : 'border-border/30'}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!selected} onCheckedChange={() => handleMultiToggle(group.id, opt)} />
                  <span className="text-sm">{opt.name}</span>
                </div>
                {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <RadioGroup
        value={(selections[group.id] || [])[0]?.name || ''}
        onValueChange={(val) => {
          const opt = (group.options || []).find(o => o.name === val);
          if (opt) handleSingleSelect(group.id, opt);
        }}
        className="space-y-2.5"
      >
        {(group.options || []).map(opt => {
          const selected = (selections[group.id] || [])[0]?.name === opt.name;
          return (
            <label
              key={opt.name}
              className={`flex items-center justify-between gap-3 min-h-[52px] px-3.5 rounded-xl border cursor-pointer transition-colors hover:bg-accent/40 ${selected ? 'border-primary/30 bg-primary/5' : 'border-border/30'}`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={opt.name} id={`${group.id}-${opt.name}`} />
                <span className="text-sm">{opt.name}</span>
              </div>
              {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
            </label>
          );
        })}
      </RadioGroup>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col max-h-[90dvh] p-0 gap-0 overflow-hidden rounded-2xl sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Sticky header */}
        <div className="glass-header shrink-0 px-5 pt-5 pb-4 border-b border-border/30 z-10">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center justify-between pr-10 text-base font-semibold">
              <span className="truncate">Customize {item.name}</span>
              <Badge variant="secondary" className="shrink-0">${totalPrice.toFixed(2)}</Badge>
            </DialogTitle>
          </DialogHeader>
          {item.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">{item.description}</p>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-7">
          {optionGroups.map(group => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="font-semibold text-sm">{group.name}</Label>
                {showRequirementBadges && (group.required ? (
                  <Badge variant="default" className="text-xs">Required</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                ))}
                {group.input_type === 'options' && !group.allow_multiple && (
                  <span className="text-xs text-muted-foreground">Choose one</span>
                )}
                {group.input_type === 'options' && group.allow_multiple && (
                  <span className="text-xs text-muted-foreground">Choose multiple</span>
                )}
              </div>
              {renderGroup(group)}
            </div>
          ))}
          <div className="space-y-3">
            <Label htmlFor="cust-notes">Special Instructions</Label>
            <textarea
              ref={notesRef}
              id="cust-notes"
              className="w-full min-h-[48px] resize-none rounded-xl border border-border/30 bg-muted/20 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-transparent transition-all"
              value={notes}
              onChange={handleNotesChange}
              placeholder="No sugar, extra hot, etc."
              rows={2}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="glass-header shrink-0 px-5 pt-4 pb-5 border-t border-border/30 safe-area-bottom z-10">
          {preOrderMode && (
            <div className="mb-4">
              <PreArrivalTimePicker settings={preArrivalSettings} value={arrivalTime} onChange={setArrivalTime} />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {preArrivalSettings?.pre_arrival_enabled !== false && (
              <Button
                variant={preOrderMode ? "outline" : "secondary"}
                onClick={() => { setPreOrderMode(!preOrderMode); setArrivalTime(''); }}
              >
                <Clock className="w-4 h-4 mr-1" /> {preOrderMode ? 'Standard Order' : 'Pre-Arrival'}
              </Button>
            )}
            <Button onClick={handleConfirm} disabled={!canConfirm || (preOrderMode && !arrivalTime)}>
              {preOrderMode
                ? `Confirm Pre-Arrival · $${totalPrice.toFixed(2)}`
                : canConfirm ? `Add · $${totalPrice.toFixed(2)}` : 'Select required'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}