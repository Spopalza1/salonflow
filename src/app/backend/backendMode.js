export const BACKEND_MODES = Object.freeze({ BASE44: 'base44', LOCAL: 'local' });
export function resolveBackendMode() {
  const requested = localStorage.getItem('salonflow_backend_mode') || import.meta.env.VITE_BACKEND_MODE || BACKEND_MODES.BASE44;
  return requested === BACKEND_MODES.LOCAL ? BACKEND_MODES.LOCAL : BACKEND_MODES.BASE44;
}
export function setBackendMode(mode) {
  if (!Object.values(BACKEND_MODES).includes(mode)) throw new Error(`Unsupported backend mode: ${mode}`);
  localStorage.setItem('salonflow_backend_mode', mode);
}
export async function probeLocalBackend(baseUrl = import.meta.env.VITE_LOCAL_API_URL || 'http://127.0.0.1:4317') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    return response.ok ? response.json() : { ok: false, status: response.status };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  } finally { clearTimeout(timer); }
}
