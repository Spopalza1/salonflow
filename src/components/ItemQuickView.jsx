import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as UIImage } from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

export default function ItemQuickView({ item, open, onOpenChange, onConfirm, isComplimentary }) {
  const [preOrderMode, setPreOrderMode] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');

  if (!item) return null;

  const resetState = () => {
    setPreOrderMode(false);
    setArrivalTime('');
  };

  const handleClose = (v) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  const handlePreOrderConfirm = () => {
    if (!arrivalTime) return;
    onConfirm(arrivalTime);
    resetState();
  };

  const minDateTime = () => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    d.setSeconds(0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex flex-col max-h-[90dvh] p-0 gap-0 overflow-hidden rounded-2xl sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Sticky header */}
        <div className="glass-header shrink-0 px-5 pt-5 pb-4 border-b border-border/30 z-10">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center justify-between pr-10 text-base font-semibold">
              <span className="truncate">{item.name}</span>
              <Badge variant="secondary" className="shrink-0">
                {isComplimentary ? 'Complimentary' : item.price != null ? `$${item.price.toFixed(2)}` : ''}
              </Badge>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
          {preOrderMode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Set your arrival time
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrival-time">Arrival Time</Label>
                <Input
                  id="arrival-time"
                  type="datetime-local"
                  value={arrivalTime}
                  min={minDateTime()}
                  onChange={(e) => setArrivalTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The front desk will be alerted 10 minutes before your arrival.
                </p>
              </div>
            </div>
          ) : (
            <>
              {item.image_url && (
                <div className="w-full h-48 rounded-xl overflow-hidden">
                  <UIImage src={item.image_url} alt={item.name} className="w-full h-full" fittingType="fill" />
                </div>
              )}
              {item.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              )}
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className="glass-header shrink-0 px-5 pt-4 pb-5 border-t border-border/30 safe-area-bottom z-10">
          <DialogFooter className="gap-2">
            {preOrderMode ? (
              <>
                <Button variant="outline" onClick={() => setPreOrderMode(false)}>Back</Button>
                <Button onClick={handlePreOrderConfirm} disabled={!arrivalTime}>
                  Confirm Pre-Arrival Order
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                <Button variant="secondary" onClick={() => setPreOrderMode(true)}>
                  <Clock className="w-4 h-4 mr-1" /> Pre-Arrival
                </Button>
                <Button onClick={() => { onConfirm(null); resetState(); }}>
                  {isComplimentary ? 'Request' : item.price != null ? `Request · $${item.price.toFixed(2)}` : 'Request'}
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}