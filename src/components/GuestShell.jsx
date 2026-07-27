import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Premium guest-facing shell shared by the guest welcome, choice, message,
 * and menu views. The shell intentionally keeps the salon media visible
 * behind a translucent Liquid Glass veil instead of replacing it with an
 * opaque page background.
 */
export default function GuestShell({ bgImage, bgVideo, overlayOpacity = 80, children }) {
  const requestedOpacity = Math.min(100, Math.max(0, overlayOpacity ?? 80)) / 100;
  const hasMedia = Boolean(bgVideo || bgImage);
  const videoRef = useRef(null);

  useEffect(() => {
    if (bgVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [bgVideo]);

  // Keep the veil deliberately translucent. The admin-controlled overlay
  // still influences readability, but it can no longer turn the page opaque.
  const veilOpacity = 0.2 + requestedOpacity * 0.28;
  const blurAmount = 14 + requestedOpacity * 10;

  return (
    <div className="guest-shell min-h-screen relative overflow-x-hidden safe-area-left safe-area-right">
      <div className="fixed inset-0 -z-30 bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/0.24),transparent_38%),radial-gradient(circle_at_85%_12%,hsl(var(--accent)/0.18),transparent_34%),linear-gradient(145deg,hsl(var(--background)),hsl(var(--muted)))]" />

      {bgVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="fixed inset-0 h-full w-full object-cover -z-20"
          src={bgVideo}
        />
      ) : bgImage ? (
        <div
          className="fixed inset-0 h-full w-full bg-cover bg-center -z-20 scale-[1.03]"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      ) : null}

      {/* Decorative ambient light remains pointer-transparent and subtle. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -left-24 top-[12%] h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          animate={{ x: [0, 28, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-28 bottom-[8%] h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"
          animate={{ x: [0, -24, 0], y: [0, 22, 0], scale: [1.05, 0.96, 1.05] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div
        className="relative min-h-screen"
        style={{
          background: hasMedia
            ? `linear-gradient(145deg, hsl(var(--background) / ${veilOpacity}), hsl(var(--background) / ${Math.max(0.14, veilOpacity - 0.09)}))`
            : 'linear-gradient(145deg, hsl(var(--background) / 0.28), hsl(var(--muted) / 0.2))',
          backdropFilter: `blur(${blurAmount}px) saturate(155%)`,
          WebkitBackdropFilter: `blur(${blurAmount}px) saturate(155%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
