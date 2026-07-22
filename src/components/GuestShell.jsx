export default function GuestShell({ bgImage, overlayOpacity = 80, children }) {
  if (!bgImage) {
    return <div className="min-h-screen bg-muted/30">{children}</div>;
  }
  const opacity = (overlayOpacity ?? 80) / 100;
  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen" style={{ backgroundColor: `hsl(var(--background) / ${opacity})` }}>
        {children}
      </div>
    </div>
  );
}