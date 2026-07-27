import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as UIImage } from '@/components/ui/image';
import { Clock } from 'lucide-react';
import PreArrivalTimePicker from '@/components/prearrival/PreArrivalTimePicker';

export default function ItemQuickView({ item, open, onOpenChange, onConfirm, isComplimentary, preArrivalSettings }) {
  const [preOrderMode, setPreOrderMode] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  if (!item) return null;
  const reset = () => { setPreOrderMode(false); setArrivalTime(''); };
  const close = (v) => { if (!v) reset(); onOpenChange(v); };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg" onOpenAutoFocus={e => e.preventDefault()}>
    <div className="glass-header shrink-0 border-b border-border/30 px-5 pb-4 pt-5"><DialogHeader><DialogTitle className="flex items-center justify-between gap-3 pr-8"><span className="truncate">{item.name}</span><Badge variant="secondary">{isComplimentary ? 'Complimentary' : item.price != null ? `$${item.price.toFixed(2)}` : ''}</Badge></DialogTitle></DialogHeader></div>
    <div className="chat-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5">{preOrderMode ? <PreArrivalTimePicker settings={preArrivalSettings} value={arrivalTime} onChange={setArrivalTime} /> : <>{item.image_url && <div className="h-52 w-full overflow-hidden rounded-2xl"><UIImage src={item.image_url} alt={item.name} className="h-full w-full" fittingType="fill" /></div>}{item.description && <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>}</>}</div>
    <div className="glass-header shrink-0 border-t border-border/30 px-5 pb-5 pt-4 safe-area-bottom"><DialogFooter className="gap-2">{preOrderMode ? <><Button variant="outline" onClick={() => { setPreOrderMode(false); setArrivalTime(''); }}>Back</Button><Button onClick={() => { if (arrivalTime) { onConfirm(arrivalTime); reset(); } }} disabled={!arrivalTime}>Confirm Pre-Arrival Order</Button></> : <><Button variant="outline" onClick={() => close(false)}>Cancel</Button>{preArrivalSettings?.pre_arrival_enabled !== false && <Button variant="secondary" onClick={() => setPreOrderMode(true)}><Clock className="mr-1 h-4 w-4" />Pre-Arrival</Button>}<Button onClick={() => { onConfirm(null); reset(); }}>{isComplimentary ? 'Request' : item.price != null ? `Request · $${item.price.toFixed(2)}` : 'Request'}</Button></>}</DialogFooter></div>
  </DialogContent></Dialog>;
}
