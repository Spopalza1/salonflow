import { useRef, useEffect, useLayoutEffect } from 'react';

/**
 * Saves and restores scroll position per tab so switching tabs
 * doesn't reset the scroll to the top.
 * Returns a ref to attach to the scrollable container.
 */
export function useTabScrollRestoration(activeTab) {
  const containerRef = useRef(null);
  const scrollPositions = useRef({});
  const prevTabRef = useRef(activeTab);

  // Save previous tab's scroll & restore new tab's scroll on tab change
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (prevTabRef.current !== activeTab) {
      scrollPositions.current[prevTabRef.current] = container.scrollTop;
      container.scrollTop = scrollPositions.current[activeTab] || 0;
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Continuously track scroll position for the active tab
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        scrollPositions.current[activeTab] = container.scrollTop;
        rafId = null;
      });
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeTab]);

  return containerRef;
}