import { useRef, useEffect } from 'react';

/**
 * Detects horizontal drag/swipe gestures (touch or mouse) and navigates
 * between tabs. Uses Pointer Events for cross-device support.
 *
 * @param {string[]} tabs - Ordered list of tab values
 * @param {string} activeTab - Currently active tab value
 * @param {(tab: string) => void} onTabChange - Callback when a swipe navigates
 * @param {number} threshold - Minimum px distance to count as a swipe
 */
export function useSwipeNavigation(tabs, activeTab, onTabChange, threshold = 60) {
  const start = useRef(null);
  const state = useRef({ tabs, activeTab, onTabChange, threshold });
  state.current = { tabs, activeTab, onTabChange, threshold };

  useEffect(() => {
    const handleUp = (e) => {
      if (!start.current) return;
      const { tabs, activeTab, onTabChange, threshold } = state.current;
      const dx = start.current.x - e.clientX;
      const dy = start.current.y - e.clientY;
      start.current = null;

      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const i = tabs.indexOf(activeTab);
      if (dx > 0 && i < tabs.length - 1) onTabChange(tabs[i + 1]);
      else if (dx < 0 && i > 0) onTabChange(tabs[i - 1]);
    };

    const handleCancel = () => { start.current = null; };

    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, []);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
  };

  return { onPointerDown };
}