import { useRef, useState, useEffect } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!pulling.current) return;
      const distance = e.touches[0].clientY - startY.current;
      if (distance > 0) {
        const clamped = Math.min(distance * 0.4, 70);
        pullDistRef.current = clamped;
        setPullDistance(clamped);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistRef.current > 50 && !refreshingRef.current) {
        refreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(40);
        try { await onRefreshRef.current?.(); } catch {}
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
      pullDistRef.current = 0;
      setPullDistance(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <>
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: isRefreshing ? 40 : pullDistance }}
          className="flex items-center justify-center overflow-hidden"
        >
          <div className={`w-5 h-5 border-2 border-muted border-t-primary rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      {children}
    </>
  );
}