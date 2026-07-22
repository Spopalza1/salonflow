export default function GuestShell({ bgImage, bgVideo, overlayOpacity = 80, children }) {
  const opacity = (overlayOpacity ?? 80) / 100;
  const hasMedia = bgVideo || bgImage;

  if (!hasMedia) {
    return <div className="min-h-screen bg-muted/30">{children}</div>;
  }

  return (
    <div className="min-h-screen relative">
      {bgVideo ? (
        <video
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