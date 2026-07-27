import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { normalizePreArrivalSettings } from '@/lib/preArrival';

const NumberField = ({ label, value, onChange, help, optional = false }) => <div className="space-y-2"><Label>{label}</Label><Input type="number" min="0" value={value ?? ''} placeholder={optional ? 'No limit' : '0'} onChange={e => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} /><p className="text-xs text-muted-foreground">{help}</p></div>;

export default function PreArrivalSettingsDialog({ open, onOpenChange, settings, onSave }) {
  const [form, setForm] = useState(normalizePreArrivalSettings(settings));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(normalizePreArrivalSettings(settings)); }, [open, settings]);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const save = async () => { setSaving(true); try { await onSave(form); onOpenChange(false); } finally { setSaving(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-hidden p-0 sm:max-w-2xl"><DialogHeader className="glass-header border-b px-6 py-5"><DialogTitle>Pre-Arrival Order Settings</DialogTitle><DialogDescription>Control same-day guest ordering without changing code.</DialogDescription></DialogHeader><div className="chat-scroll max-h-[65dvh] space-y-6 overflow-y-auto px-6 py-5">
    <div className="grid gap-4 rounded-2xl border border-border/30 bg-muted/20 p-4 sm:grid-cols-2"><label className="flex items-center justify-between gap-4"><span><span className="block text-sm font-medium">Enable pre-arrival orders</span><span className="text-xs text-muted-foreground">Show the option in the guest menu.</span></span><Switch checked={form.pre_arrival_enabled} onCheckedChange={v => set('pre_arrival_enabled', v)} /></label><label className="flex items-center justify-between gap-4"><span><span className="block text-sm font-medium">Use business hours</span><span className="text-xs text-muted-foreground">Respect opening, closing and closed days.</span></span><Switch checked={form.pre_arrival_use_business_hours} onCheckedChange={v => set('pre_arrival_use_business_hours', v)} /></label></div>
    <div className="grid gap-5 sm:grid-cols-2"><NumberField label="Minimum preparation time (minutes)" value={form.pre_arrival_minimum_preparation_minutes} onChange={v => set('pre_arrival_minimum_preparation_minutes', v)} help="Added to the current salon-local time." /><NumberField optional label="Maximum future arrival window (minutes)" value={form.pre_arrival_maximum_future_minutes} onChange={v => set('pre_arrival_maximum_future_minutes', v)} help="Leave empty to allow ordering until the closing cutoff." /><NumberField label="Cutoff before closing (minutes)" value={form.pre_arrival_cutoff_before_closing_minutes} onChange={v => set('pre_arrival_cutoff_before_closing_minutes', v)} help="Stops arrivals this many minutes before closing." /><NumberField label="Opening delay (minutes)" value={form.pre_arrival_opening_delay_minutes} onChange={v => set('pre_arrival_opening_delay_minutes', v)} help="Delays the first valid arrival after opening." /></div>
    <div className="space-y-2"><Label>Salon timezone</Label><Input value={form.timezone || ''} onChange={e => set('timezone', e.target.value)} placeholder="America/Toronto" /><p className="text-xs text-muted-foreground">Use an IANA timezone such as America/Toronto.</p></div>
    <div className="space-y-2"><Label>Guest instructions</Label><Textarea value={form.pre_arrival_instructions || ''} onChange={e => set('pre_arrival_instructions', e.target.value)} placeholder="Please arrive at the selected time. The front desk will prepare your request." /></div>
  </div><DialogFooter className="glass-header border-t px-6 py-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button></DialogFooter></DialogContent></Dialog>;
}
