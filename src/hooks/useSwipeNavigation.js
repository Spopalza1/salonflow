import { useRef } from 'react';

/**
 * Detects horizontal swipe gestures on touch devices and navigates
 * between tabs. Vertical scrolling is unaffected.
 *
 * @param {string[]} tabs - Ordered list of tab values
 * @param {string} activeTab - Currently active tab value
 * @param {(tab: string) => void} onTabChange - Callback when a swipe navigates
 * @param {number} threshold - Minimum px distance to count as a swipe
 */
export function useSwipeNavigation(tabs, activeTab, onTabChange, threshold = 60) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e) => {
    const diffX = Math.abs(e.touches[0].clientX - startX.current);
    const diffY = Math.abs(e.touches[0].clientY - startY.current);
    if (diffX > 12 && diffX > diffY * 1.5) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping.current) return;
    const endX = e.changedTouches[0].clientX;
    const diff = startX.current - endX;
    if (Math.abs(diff) < threshold) return;

    const currentIndex = tabs.indexOf(activeTab);
    if (diff > 0 && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1]);
    } else if (diff < 0 && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1]);
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}