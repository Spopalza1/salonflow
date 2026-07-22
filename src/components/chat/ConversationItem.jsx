import { useState, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REVEAL_WIDTH = 80;
const HOLD_DURATION = 500;

export default function ConversationItem({ stylist, isSelected, hasUnread, onSelect, onDelete }) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const holdTimer = useRef(null);
  const movedRef = useRef(false);

  const name = stylist.display_name || stylist.full_name || stylist.email;

  const close = useCallback(() => {
    setOffset(0);
    setRevealed(false);
  }, []);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    dragging.current = true;
    movedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) movedRef.current = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      const next = Math.min(0, Math.max(-REVEAL_WIDTH, dx));
      setOffset(next);
    }
  };

  const handleTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offset < -REVEAL_WIDTH / 2) {
      setOffset(-REVEAL_WIDTH);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
  };

  const startHold = (e) => {
    // Only for mouse (desktop)
    if (e.pointerType === 'touch' || e.type === 'touchstart') return;
    movedRef.current = false;
    holdTimer.current = setTimeout(() => {
      if (!movedRef.current) {
        setOffset(-REVEAL_WIDTH);
        setRevealed(true);
      }
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleClick = () => {
    if (revealed) {
      close();
      return;
    }
    if (movedRef.current) return;
    onSelect();
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete();
    close();
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: REVEAL_WIDTH }}>
        <Button
          variant="destructive"
          size="icon"
          className="h-full w-full rounded-none"
          onClick={handleDeleteClick}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Foreground content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerMove={() => { movedRef.current = true; cancelHold(); }}
        onClick={handleClick}
        style={{ transform: `translateX(${offset}px)`, transition: dragging.current ? 'none' : 'transform 0.2s ease' }}
        className={`relative w-full text-left px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer select-none ${
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'
        }`}
      >
        <span className="text-sm font-medium truncate">{name}</span>
        {hasUnread && !isSelected && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ml-2" />
        )}
      </div>
    </div>
  );
}