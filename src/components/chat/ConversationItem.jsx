import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, User, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image as UIImage } from '@/components/ui/image';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';

const REVEAL_WIDTH = 80;

// Module-level: track the currently open swipe so only one can be open at a time
let activeSwipeClose = null;

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

export default function ConversationItem({ stylist, isSelected, unreadCount = 0, lastMessage, lastMessageTime, onSelect, onRemove }) {
  const [offset, setOffset] = useState(0);
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const movedRef = useRef(false);

  const name = stylist.display_name || stylist.full_name || stylist.email;
  const hasUnread = unreadCount > 0;

  const closeSwipe = useCallback(() => setOffset(0), []);

  // Click outside to close any open swipe
  useEffect(() => {
    if (offset === 0) return;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeSwipe();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [offset, closeSwipe]);

  // Only one swipe open at a time
  useEffect(() => {
    if (offset !== 0) {
      if (activeSwipeClose && activeSwipeClose !== closeSwipe) {
        activeSwipeClose();
      }
      activeSwipeClose = closeSwipe;
    } else if (activeSwipeClose === closeSwipe) {
      activeSwipeClose = null;
    }
  }, [offset, closeSwipe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSwipeClose === closeSwipe) {
        activeSwipeClose = null;
      }
    };
  }, [closeSwipe]);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
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
    } else {
      setOffset(0);
    }
  };

  const handleClick = () => {
    if (movedRef.current) return;
    if (offset !== 0) { setOffset(0); return; }
    onSelect();
  };

  const handleRemoveClick = (e) => {
    e?.stopPropagation?.();
    setOffset(0);
    onRemove();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={containerRef} className="group relative overflow-hidden rounded-xl">
          {/* Delete action — hidden behind opaque foreground, revealed only on swipe */}
          <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: REVEAL_WIDTH }}>
            <Button variant="destructive" size="icon" className="h-full w-full rounded-none" onClick={handleRemoveClick}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Foreground content — opaque background completely covers the delete action */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            style={{ transform: `translateX(${offset}px)`, transition: dragging.current ? 'none' : 'transform 0.2s ease' }}
            className={`relative w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer select-none transition-colors ${isSelected ? 'bg-muted' : 'bg-card hover:bg-accent'}`}
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
              <p className="text-xs text-muted-foreground truncate">{lastMessage || 'No messages yet'}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
                  aria-label="Conversation options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRemoveClick} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRemoveClick} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Remove Conversation
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}