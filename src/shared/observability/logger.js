const redact = (value) => {
  if (!value || typeof value !== 'object') return value;
  const clone = { ...value };
  for (const key of ['token', 'access_token', 'authorization', 'password']) {
    if (key in clone) clone[key] = '[REDACTED]';
  }
  return clone;
};

export const logger = {
  debug(event, context = {}) {
    if (import.meta.env?.DEV) console.debug(`[SalonFlow] ${event}`, redact(context));
  },
  info(event, context = {}) { console.info(`[SalonFlow] ${event}`, redact(context)); },
  warn(event, context = {}) { console.warn(`[SalonFlow] ${event}`, redact(context)); },
  error(event, error, context = {}) {
    console.error(`[SalonFlow] ${event}`, { ...redact(context), error: error?.message || String(error) });
  },
};
