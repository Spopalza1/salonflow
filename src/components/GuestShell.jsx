import { useRef, useEffect } from 'react';

export default function GuestShell({ bgImage, bgVideo, overlayOpacity = 80, children }) {
  const opacity = (overlayOpacity ?? 80) / 100;
  const hasMedia = bgVideo || bgImage;
  const videoRef = useRef(null);

  useEffect(() => {
    if (bgVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [bgVideo]);

  if (!hasMedia) {
    return <div className="min-h-screen bg-muted/30">{children}</div>;
  }

  return (
    <div className="min-h-screen relative">
      {bgVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="fixed inset-0 w-full h-full object-cover -z-10"
          src={bgVideo}
        />
      ) : (
        <div
          className="fixed inset-0 w-full h-full bg-cover bg-center -z-10"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <div className="relative min-h-screen" style={{ backgroundColor: `hsl(var(--background) / ${opacity})` }}>
        {children}
      </div>
    </div>
  );
}