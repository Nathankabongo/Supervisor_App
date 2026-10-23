/** Same-origin defaults so the Vite proxy works for any host (localhost, 127.0.0.1, LAN). */

const isLoopback = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1';

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Prefer relative `/api` (proxied to :5000 by Vite).
 * If an absolute localhost URL is set but the page was opened via another host,
 * fall back to `/api` to avoid cross-origin NetworkError.
 */
function resolveApiUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api';
  const base = normalizeBase(raw);

  if (typeof window === 'undefined') {
    return base.startsWith('http') ? base : 'http://127.0.0.1:5000/api';
  }

  if (/^https?:\/\//i.test(base)) {
    try {
      const configured = new URL(base);
      if (isLoopback(configured.hostname) && !isLoopback(window.location.hostname)) {
        return '/api';
      }
    } catch {
      /* keep base */
    }
  }

  return base;
}

/**
 * Empty string = current page origin (Vite proxies `/socket.io` to :5000).
 * Avoid hardcoding localhost:5000, which breaks on 127.0.0.1 / LAN IP.
 */
function resolveSocketUrl(): string {
  const raw = import.meta.env.VITE_SOCKET_URL;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '';
  }

  const base = normalizeBase(String(raw).trim());

  if (typeof window !== 'undefined' && /^https?:\/\//i.test(base)) {
    try {
      const configured = new URL(base);
      if (isLoopback(configured.hostname) && !isLoopback(window.location.hostname)) {
        return '';
      }
    } catch {
      /* keep base */
    }
  }

  return base;
}

export const API_URL = resolveApiUrl();
export const SOCKET_URL = resolveSocketUrl();
