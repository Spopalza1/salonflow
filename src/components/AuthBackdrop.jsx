import { Bell, ClipboardList, Coffee, MessageSquare, Scissors, Users } from 'lucide-react';

export default function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,hsl(var(--primary)/0.24),transparent_32%),radial-gradient(circle_at_84%_78%,hsl(var(--primary)/0.16),transparent_36%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.78))]" />
      <div className="absolute inset-5 sm:inset-8 opacity-65 blur-[1px]">
        <div className="h-full rounded-[2rem] border border-white/20 bg-background/35 shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/15 px-6 py-5">
            <div className="flex items-center gap-3"><Scissors className="h-6 w-6 text-primary"/><span className="font-semibold text-lg">SalonFlow</span></div>
            <div className="flex items-center gap-4"><Bell className="h-5 w-5"/><div className="h-9 w-28 rounded-full bg-white/10"/></div>
          </div>
          <div className="flex gap-3 border-b border-white/10 px-6 py-4">
            {[ClipboardList, Coffee, MessageSquare, Users].map((Icon, index) => <div key={index} className="flex h-10 w-28 items-center justify-center rounded-xl bg-white/[0.08]"><Icon className="h-4 w-4"/></div>)}
          </div>
          <div className="grid h-[calc(100%-130px)] grid-cols-12 gap-5 p-6">
            <div className="col-span-4 rounded-3xl border border-white/10 bg-white/[0.08] p-4"><div className="mb-4 h-10 rounded-xl bg-white/10"/><div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-16 rounded-2xl bg-white/[0.08]"/>)}</div></div>
            <div className="col-span-8 rounded-3xl border border-white/10 bg-white/[0.08] p-5"><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-28 rounded-2xl bg-white/10"/>)}</div><div className="mt-5 h-[55%] rounded-3xl bg-white/[0.07]"/></div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-background/25 backdrop-blur-[8px]" />
    </div>
  );
}
