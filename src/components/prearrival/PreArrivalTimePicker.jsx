import { useEffect, useMemo, useState } from 'react';
import { Clock3, CalendarDays, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildArrivalDate, formatSalonDate, formatSalonTime, getPreArrivalWindow, getZonedParts, normalizePreArrivalSettings, validateArrivalDate } from '@/lib/preArrival';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function PreArrivalTimePicker({ settings, value, onChange, className }) {
  const normalized = normalizePreArrivalSettings(settings);
  const window = useMemo(() => getPreArrivalWindow(normalized), [JSON.stringify(normalized)]);
  const initial = useMemo(() => {
    const source = value ? new Date(value) : window.earliest || new Date();
    const p = getZonedParts(source, normalized.timezone);
    return { hour: p.hour % 12 || 12, minute: p.minute, period: p.hour >= 12 ? 'PM' : 'AM' };
  }, [value, window.earliest?.getTime(), normalized.timezone]);
  const [selection, setSelection] = useState(initial);

  useEffect(() => setSelection(initial), [initial.hour, initial.minute, initial.period]);

  const candidate = useMemo(() => buildArrivalDate(selection, normalized), [selection.hour, selection.minute, selection.period, JSON.stringify(normalized)]);
  const validation = useMemo(() => validateArrivalDate(candidate, normalized), [candidate.getTime(), JSON.stringify(normalized)]);

  useEffect(() => onChange?.(validation.valid ? candidate.toISOString() : '', validation), [candidate.getTime(), validation.valid, validation.message]);

  const minuteValid = (minute) => validateArrivalDate(buildArrivalDate({ ...selection, minute }, normalized), normalized).valid;
  const hourValid = (hour, period = selection.period) => MINUTES.some(minute => validateArrivalDate(buildArrivalDate({ hour, minute, period }, normalized), normalized).valid);
  const periodValid = (period) => HOURS.some(hour => MINUTES.some(minute => validateArrivalDate(buildArrivalDate({ hour, minute, period }, normalized), normalized).valid));

  if (!window.available) return <div className={cn('sf-prearrival-unavailable', className)}><AlertCircle className="h-5 w-5" /><div><p className="font-medium">Unavailable</p><p className="text-sm text-muted-foreground">{window.reason}</p></div></div>;

  return (
    <div className={cn('sf-prearrival-picker', className)}>
      <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 dark:bg-white/[0.04]">
        <CalendarDays className="h-5 w-5 text-primary" />
        <div><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Arrival date</p><p className="text-sm font-semibold">Today — {formatSalonDate(new Date(), normalized.timezone)}</p></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><Label>Arrival time</Label></div>
        <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-2">
          <Select value={String(selection.hour)} onValueChange={v => setSelection(s => ({ ...s, hour: Number(v) }))}><SelectTrigger aria-label="Hour" className="h-12 rounded-2xl text-center"><SelectValue /></SelectTrigger><SelectContent>{HOURS.map(h => <SelectItem key={h} value={String(h)} disabled={!hourValid(h)}>{String(h).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
          <span className="text-xl font-semibold">:</span>
          <Select value={String(selection.minute)} onValueChange={v => setSelection(s => ({ ...s, minute: Number(v) }))}><SelectTrigger aria-label="Minute" className="h-12 rounded-2xl text-center"><SelectValue /></SelectTrigger><SelectContent className="max-h-72">{MINUTES.map(m => <SelectItem key={m} value={String(m)} disabled={!minuteValid(m)}>{String(m).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
          <Select value={selection.period} onValueChange={v => setSelection(s => ({ ...s, period: v }))}><SelectTrigger aria-label="AM or PM" className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AM" disabled={!periodValid('AM')}>AM</SelectItem><SelectItem value="PM" disabled={!periodValid('PM')}>PM</SelectItem></SelectContent></Select>
        </div>
        <div className={cn('rounded-xl px-3 py-2 text-xs', validation.valid ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-destructive/10 text-destructive')}>
          {validation.valid ? `Arrival selected for ${formatSalonTime(candidate, normalized.timezone)}.` : validation.message}
        </div>
        {normalized.pre_arrival_instructions && <p className="text-xs leading-relaxed text-muted-foreground">{normalized.pre_arrival_instructions}</p>}
      </div>
    </div>
  );
}
