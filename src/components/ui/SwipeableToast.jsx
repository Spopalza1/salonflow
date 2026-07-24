import { useState, useRef } from 'react';
import { Toast, ToastClose, ToastDescription, ToastTitle } from '@/components/ui/toast';
import { Info, AlertCircle } from 'lucide-react';

const SWIPE_THRESHOLD = 75;

export default function SwipeableToast({ id, title, description, action, dismiss, variant, ...props }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [swiping, setSwiping] = useState(false);
  const startRef = useRef(null);

  const handlePointerDown = (e) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    setSwiping(true);
  };

  const handlePointerMove = (e) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setOffset({ x: dx, y: Math.min(0, dy) });
  };

  const handlePointerEnd = () => {
    if (!startRef.current) return;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      dismiss(id);
    }
    setOffset({ x: 0, y: 0 });
    setSwiping(false);
    startRef.current = null;
  };

  const maxDist = Math.max(Math.abs(offset.x), Math.abs(offset.y));
  const Icon = variant === 'destructive' ? AlertCircle : Info;

  return (
    <Toast
      {...props}
      variant={variant}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: swiping ? 'none' : 'transform 0.2s ease-out',
        opacity: swiping && maxDist > 10 ? Math.max(0.3, 1 - maxDist / 300) : 1,
        touchAction: 'none',
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${variant === 'destructive' ? 'text-white' : 'text-primary'}`} />
        <div className="grid gap-1 flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  );
}