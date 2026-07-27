export const DEFAULT_PRE_ARRIVAL_SETTINGS = {
  timezone: 'America/Toronto',
  pre_arrival_enabled: true,
  pre_arrival_same_day_only: true,
  pre_arrival_minimum_preparation_minutes: 20,
  pre_arrival_maximum_future_minutes: null,
  pre_arrival_cutoff_before_closing_minutes: 0,
  pre_arrival_opening_delay_minutes: 0,
  pre_arrival_use_business_hours: true,
  pre_arrival_instructions: '',
};

export function normalizePreArrivalSettings(value = {}) {
  return { ...DEFAULT_PRE_ARRIVAL_SETTINGS, ...value };
}

export function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second), weekday: parts.weekday,
  };
}

export function zonedLocalToUtc({ year, month, day, hour, minute }, timeZone) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const actual = getZonedParts(new Date(guess), timeZone);
    const intendedAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, 0);
    guess += intendedAsUtc - actualAsUtc;
  }
  return new Date(guess);
}

function parseClock(value, fallbackHour, fallbackMinute = 0) {
  if (!value || typeof value !== 'string') return { hour: fallbackHour, minute: fallbackMinute };
  const [h, m] = value.split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : fallbackHour, minute: Number.isFinite(m) ? m : fallbackMinute };
}

function daySettings(settings, date = new Date()) {
  const timezone = settings.timezone || DEFAULT_PRE_ARRIVAL_SETTINGS.timezone;
  const parts = getZonedParts(date, timezone);
  const names = { Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday' };
  return settings.business_hours?.[names[parts.weekday]] || null;
}

export function getPreArrivalWindow(settingsInput, now = new Date()) {
  const settings = normalizePreArrivalSettings(settingsInput);
  const timezone = settings.timezone;
  const today = getZonedParts(now, timezone);
  if (!settings.pre_arrival_enabled) return { available: false, reason: 'Pre-arrival ordering is currently unavailable.' };

  const day = daySettings(settings, now);
  if (settings.pre_arrival_use_business_hours && day && day.closed) {
    return { available: false, reason: 'Pre-arrival ordering is unavailable today.' };
  }

  const openClock = parseClock(day?.open, 0, 0);
  const closeClock = parseClock(day?.close, 23, 59);
  const opening = zonedLocalToUtc({ ...today, ...openClock }, timezone);
  const closing = zonedLocalToUtc({ ...today, ...closeClock }, timezone);
  const preparation = Math.max(0, Number(settings.pre_arrival_minimum_preparation_minutes) || 0);
  const openingDelay = Math.max(0, Number(settings.pre_arrival_opening_delay_minutes) || 0);
  const cutoff = Math.max(0, Number(settings.pre_arrival_cutoff_before_closing_minutes) || 0);
  const earliestByNow = new Date(now.getTime() + preparation * 60000);
  const earliestByOpening = new Date(opening.getTime() + openingDelay * 60000);
  const earliestRaw = new Date(Math.max(earliestByNow.getTime(), earliestByOpening.getTime()));
  const earliest = new Date(Math.ceil(earliestRaw.getTime() / 60000) * 60000);
  const latestByClosing = new Date(closing.getTime() - cutoff * 60000);
  const maxFuture = Number(settings.pre_arrival_maximum_future_minutes);
  const latestByWindow = Number.isFinite(maxFuture) && maxFuture > 0 ? new Date(now.getTime() + maxFuture * 60000) : latestByClosing;
  const latestRaw = new Date(Math.min(latestByClosing.getTime(), latestByWindow.getTime()));
  const latest = new Date(Math.floor(latestRaw.getTime() / 60000) * 60000);
  if (earliest > latest) return { available: false, reason: 'Pre-arrival ordering has closed for today.', earliest, latest, today, timezone };
  return { available: true, earliest, latest, today, timezone, settings };
}

export function buildArrivalDate({ hour, minute, period }, settingsInput, now = new Date()) {
  const settings = normalizePreArrivalSettings(settingsInput);
  const today = getZonedParts(now, settings.timezone);
  const hour24 = period === 'PM' ? (hour % 12) + 12 : hour % 12;
  return zonedLocalToUtc({ ...today, hour: hour24, minute }, settings.timezone);
}

export function validateArrivalDate(date, settingsInput, now = new Date()) {
  const window = getPreArrivalWindow(settingsInput, now);
  if (!window.available) return { valid: false, message: window.reason, window };
  const selectedParts = getZonedParts(date, window.timezone);
  if (selectedParts.year !== window.today.year || selectedParts.month !== window.today.month || selectedParts.day !== window.today.day) {
    return { valid: false, message: 'Pre-arrival orders are available for today only.', window };
  }
  if (date < window.earliest) return { valid: false, message: `Please choose a time after ${formatSalonTime(window.earliest, window.timezone)}.`, window };
  if (date > window.latest) return { valid: false, message: `Please choose a time before ${formatSalonTime(window.latest, window.timezone)}.`, window };
  return { valid: true, window };
}

export function formatSalonTime(date, timezone) {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatSalonDate(date, timezone) {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
