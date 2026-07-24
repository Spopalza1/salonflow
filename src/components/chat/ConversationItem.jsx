import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image as UIImage } from '@/components/ui/image';

const REVEAL_WIDTH = 80;
const HOLD_DURATION = 500;

const formatConvTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ConversationItem({ stylist, isSelected, unreadCount = 0, lastMessage, lastMessageTime, onSelect, onDelete }) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const holdTimer = useRef(null);
  const movedRef = useRef(false);

  const name = stylist.display_name || stylist.full_name || stylist.email;
  const hasUnread = unreadCount > 0;

  const close = useCallback(() => {
    setOffset(0);
    setRevealed(false);
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [revealed, close]);

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
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
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
        className={`relative w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer select-none transition-colors ${
          isSelected ? 'bg-primary/10' : 'bg-transparent hover:bg-muted/40'
        }`}
      >
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {stylist.profile_picture_url ? (
              <UIImage src={stylist.profile_picture_url} fittingType="fill" className="w-10 h-10" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          {hasUnread && !isSelected && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate flex-1">{name}</span>
            {lastMessageTime && (
              <span className="text-[10px] text-muted-foreground shrink-0">{formatConvTime(lastMessageTime)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate flex-1">{lastMessage || 'No messages yet'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}