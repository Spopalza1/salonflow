import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const defaults = {
  timezone: 'America/Toronto', pre_arrival_enabled: true,
  pre_arrival_minimum_preparation_minutes: 20,
  pre_arrival_maximum_future_minutes: null,
  pre_arrival_cutoff_before_closing_minutes: 0,
  pre_arrival_opening_delay_minutes: 0,
  pre_arrival_use_business_hours: true,
};

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', weekday:'short' }).formatToParts(date);
  const out: Record<string,string> = {}; parts.forEach(p => out[p.type] = p.value);
  return { year:+out.year, month:+out.month, day:+out.day, hour:+out.hour, minute:+out.minute, second:+out.second, weekday:out.weekday };
}
function zonedToUtc(parts: any, timeZone: string) {
  let guess = Date.UTC(parts.year, parts.month-1, parts.day, parts.hour, parts.minute, 0);
  for (let i=0;i<3;i++) {
    const actual = zonedParts(new Date(guess), timeZone);
    guess += Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,0)-Date.UTC(actual.year,actual.month-1,actual.day,actual.hour,actual.minute,actual.second);
  }
  return new Date(guess);
}
function parseClock(value: string | undefined, h: number, m=0) {
  const [hh,mm] = String(value || '').split(':').map(Number); return { hour:Number.isFinite(hh)?hh:h, minute:Number.isFinite(mm)?mm:m };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { salon_id, arrival_time, order_data } = body || {};
    if (!salon_id || !arrival_time || !order_data?.menu_item_id) return Response.json({ error:'Missing salon, item, or arrival time' }, { status:400 });

    const [settingsRows, item] = await Promise.all([
      base44.asServiceRole.entities.SalonSetting.filter({ salon_id }, '-created_date', 1),
      base44.asServiceRole.entities.MenuItem.get(order_data.menu_item_id),
    ]);
    if (!item || item.salon_id !== salon_id || item.available === false) return Response.json({ error:'Menu item is unavailable' }, { status:400 });
    const settings = { ...defaults, ...(settingsRows[0] || {}) };
    if (!settings.pre_arrival_enabled) return Response.json({ error:'Pre-arrival ordering is unavailable' }, { status:400 });
    const now = new Date(); const arrival = new Date(arrival_time); const tz = settings.timezone;
    if (!Number.isFinite(arrival.getTime())) return Response.json({ error:'Invalid arrival time' }, { status:400 });
    const today = zonedParts(now,tz), selected = zonedParts(arrival,tz);
    if (today.year!==selected.year || today.month!==selected.month || today.day!==selected.day) return Response.json({ error:'Pre-arrival orders are available for today only' }, { status:400 });
    const days: Record<string,string> = {Sun:'sunday',Mon:'monday',Tue:'tuesday',Wed:'wednesday',Thu:'thursday',Fri:'friday',Sat:'saturday'};
    const day = settings.business_hours?.[days[today.weekday]];
    if (settings.pre_arrival_use_business_hours && day?.closed) return Response.json({ error:'Pre-arrival ordering is unavailable today' }, { status:400 });
    const open = parseClock(day?.open,0), close = parseClock(day?.close,23,59);
    const opening = zonedToUtc({...today,...open},tz), closing = zonedToUtc({...today,...close},tz);
    const earliestRaw = new Date(Math.max(now.getTime()+(+settings.pre_arrival_minimum_preparation_minutes||0)*60000, opening.getTime()+(+settings.pre_arrival_opening_delay_minutes||0)*60000));
    const earliest = new Date(Math.ceil(earliestRaw.getTime()/60000)*60000);
    const byClose = new Date(closing.getTime()-(+settings.pre_arrival_cutoff_before_closing_minutes||0)*60000);
    const maxFuture = +settings.pre_arrival_maximum_future_minutes;
    const latestRaw = maxFuture>0 ? new Date(Math.min(byClose.getTime(), now.getTime()+maxFuture*60000)) : byClose;
    const latest = new Date(Math.floor(latestRaw.getTime()/60000)*60000);
    if (arrival < earliest || arrival > latest) return Response.json({ error:'Selected arrival time is outside the available same-day window' }, { status:400 });

    const payload = {
      ...order_data,
      item_name: item.name,
      category: item.category,
      price: item.complimentary ? null : Math.max(Number(item.price) || 0, Number(order_data.price) || 0),
      salon_id,
      is_pre_order:true,
      arrival_time:arrival.toISOString(),
      status:'pending',
    };
    const created = await base44.asServiceRole.entities.Order.create(payload);
    return Response.json({ order:created });
  } catch (error) {
    console.error('createPreArrivalOrder error', error);
    return Response.json({ error:error.message || 'Unable to create pre-arrival order' }, { status:500 });
  }
});
