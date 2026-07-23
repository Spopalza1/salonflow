import { motion } from 'framer-motion';

/**
 * Wraps tab content and enables drag-to-navigate between tabs.
 * Uses framer-motion's drag API for reliable cross-device support.
 * dragDirectionLock ensures vertical scrolling still works normally.
 */
export default function Swipeable({ tabs, activeTab, onTabChange, className, children, threshold = 60 }) {
  const currentIndex = tabs.indexOf(activeTab);

  return (
    <motion.div
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={(_, info) => {
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