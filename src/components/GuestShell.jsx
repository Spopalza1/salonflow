export default function GuestShell({ bgImage, children }) {
  if (!bgImage) {
    return <div className="min-h-screen bg-muted/30">{children}</div>;
  }
  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen bg-background/80">
        {children}
      </div>
    </div>
  );
}