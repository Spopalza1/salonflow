export function ConversationWorkspaceLayout({ sidebar, header, timeline, composer }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {sidebar}
      <section className="flex min-w-0 flex-1 flex-col">
        {header}
        <div className="min-h-0 flex-1">{timeline}</div>
        {composer}
      </section>
    </div>
  );
}
