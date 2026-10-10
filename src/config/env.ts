/**
 * The app's endpoints, read once from the `EXPO_PUBLIC_*` build variables.
 *
 * Fails closed:
 *  - a missing value is a build mistake, so it throws with the variable's name
 *    instead of silently falling back to a hard-coded LAN address;
 *  - a release build (`__DEV__` false) refuses plain `http://`. Tokens, the
 *    password grant and live rider positions travel over these URLs, and
 *    cleartext would expose all of them to anyone on the same network.
 *
 * Each variable is read with a literal `process.env.EXPO_PUBLIC_…` expression:
 * Metro only inlines those, never a computed key.
 */
function requireUrl(name: string, value: string | undefined): string {
  const url = value?.trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in, then restart Metro.`);
  }
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`${name} must be an http(s) URL, got "${url}".`);
  }
  if (!__DEV__ && !url.startsWith('https://')) {
    throw new Error(`${name} must use https:// in a release build.`);
  }
  return url;
}

export const API_URL = requireUrl('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);

export const KEYCLOAK_URL = requireUrl('EXPO_PUBLIC_KEYCLOAK_URL', process.env.EXPO_PUBLIC_KEYCLOAK_URL);

/** The STOMP endpoint on the API host: `https` → `wss`, `http` → `ws` (dev only). */
export const BROKER_URL = `${API_URL.replace(/^http/, 'ws')}/ws/websocket`;
