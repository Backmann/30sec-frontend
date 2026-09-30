/**
 * One place that decides where the websocket connects.
 *
 * This used to be derived in four different ways across the app, and one of
 * them produced `wss://30sec.org/api` — the API prefix is not part of the
 * socket endpoint, so that connection could never succeed. It went unnoticed
 * because the page polls over HTTP once a second anyway.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_WS_URL, when it is set explicitly.
 *   2. NEXT_PUBLIC_API_URL with its /api suffix removed — the socket lives at
 *      the site root, not under the API prefix.
 *   3. The current origin, so a local build works with no environment at all.
 *
 * Call it at connection time rather than at module load: on the server there
 * is no `window`, and every caller connects from inside an effect.
 */
export function getWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const api = process.env.NEXT_PUBLIC_API_URL;
  if (api) return api.replace(/\/api\/?$/, '');

  if (typeof window !== 'undefined') return window.location.origin;

  return 'https://30sec.org';
}
