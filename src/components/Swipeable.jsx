import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Wraps tab content and enables drag-to-navigate between tabs on mobile.
 * On desktop, renders a plain div (no drag) so it never interferes with
 * mouse-based interactions like reorder drag handles.
 *
 * On mobile, tracks whether a drag originated from a reorder grip handle
 * (data-reorder-grip) and skips the tab swap so reorder drags don't also
 * navigate between tabs.
 */
export default function Swipeable({ tabs, activeTab, onTabChange, className, children, threshold = 60 }) {
  const isMobile = useIsMobile();
  const currentIndex = tabs.indexOf(activeTab);
  const startedOnGripRef = useRef(false);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      dragMomentum={false}
      onPointerDownCapture={(e) => {
        const target = e.target instanceof Element ? e.target : null;
        startedOnGripRef.current = !!target?.closest('[data-reorder-grip]');
      }}
      onDragEnd={(_, info) => {
        if (startedOnGripRef.current) {
          startedOnGripRef.current = false;
          return;
        }
        if (info.offset.x < -threshold && currentIndex < tabs.length - 1) {
          onTabChange(tabs[currentIndex + 1]);
        } else if (info.offset.x > threshold && currentIndex > 0) {
          onTabChange(tabs[currentIndex - 1]);
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}