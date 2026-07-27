import { appParams } from '@/lib/app-params';

const FALLBACK_PUBLISHED_APP_URL =
  'https://artichoke-salon-sync-flow.base44.app';

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return '';

  return value
    .trim()
    .replace(/^(https?:\/\/)?preview--/, '$1')
    .replace(/\/+$/, '');
}

function isLocalOrigin(origin) {
  return (
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('file:')
  );
}

/**
 * Returns the public frontend URL used in QR codes and share links.
 *
 * Hosted web builds prefer their current origin so custom domains work
 * automatically. Electron/local development falls back to the configured
 * public URL and then the known Base44-hosted site.
 */
export function getPublishedAppUrl() {
  const publicUrl = normalizeUrl(import.meta.env.VITE_PUBLIC_APP_URL);

  if (publicUrl && !isLocalOrigin(publicUrl)) {
    return publicUrl;
  }

  return FALLBACK_PUBLISHED_APP_URL;
}


/**
 * Builds the canonical public guest-menu URL. The salon identifier is placed
 * before the hash so it survives redirects, QR scanner hand-offs, and hosts
 * that normalize fragments. GuestMenu still accepts the legacy hash-query
 * form for already printed QR codes.
 */
export function buildGuestMenuUrl(salonId, baseUrl = getPublishedAppUrl()) {
  const normalizedBase =
    normalizeUrl(baseUrl) || FALLBACK_PUBLISHED_APP_URL;

  const route = `${normalizedBase}/#/guest`;

  if (!salonId) {
    return route;
  }

  return `${route}?salon_id=${encodeURIComponent(
    String(salonId).trim(),
  )}`;
}
