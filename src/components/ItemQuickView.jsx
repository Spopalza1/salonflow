import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as UIImage } from '@/components/ui/image';

export default function ItemQuickView({ item, open, onOpenChange, onConfirm, isComplimentary }) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{item.name}</span>
            <Badge variant="secondary">
              {isComplimentary ? 'Complimentary' : item.price != null ? `$${item.price.toFixed(2)}` : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {item.image_url && (
            <div className="w-full h-48 rounded-xl overflow-hidden">
              <UIImage src={item.image_url} alt={item.name} className="w-full h-full" fittingType="fill" />
            </div>
          )}
          {item.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm}>
            {isComplimentary ? 'Request' : item.price != null ? `Request · $${item.price.toFixed(2)}` : 'Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}