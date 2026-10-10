import { keycloakConfig } from './config';
import { clearTokens, getTokens, saveTokens, type TokenSet } from './token-storage';

/**
 * Plain functions over the four OIDC endpoints the app is allowed to call:
 * token (login / refresh / code exchange), userinfo and logout. Registration
 * and profile updates deliberately live in services/api/driver-service.ts —
 * the backend owns the Keycloak admin credentials, not this bundle.
 *
 * Every call returns a result object instead of throwing, so screens can
 * render `error` directly.
 */

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

export interface KeycloakUserInfo {
  /** The join key with the backend Driver record (`keycloakUserId`). */
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  /** Custom attributes; only present when mapped into the userinfo claims,
   *  or patched in optimistically by the app after a profile update. */
  phoneNumber?: string;
  vehicleClass?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  tokens?: TokenSet;
}

function parseTokenResponse(data: KeycloakTokenResponse): TokenSet {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
  };
}

/** Thrown by fetchWithTimeout when a request exceeds the deadline. */
class TimeoutError extends Error {}

/**
 * fetch() with an AbortController deadline. React Native's fetch has no
 * default timeout, so an unreachable Keycloak host (wrong LAN IP, blocked
 * port, cleartext blocked) would otherwise spin the login button forever.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function networkErrorMessage(err: unknown): string {
  if (err instanceof TimeoutError) {
    return 'Could not reach the server. Check that the Keycloak URL is correct and reachable from this device.';
  }
  return 'Network error. Please check your connection.';
}

/** Resource-owner password grant, backing the app's native login form. */
export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  try {
    // Keycloak's token endpoint takes form-encoded bodies; JSON yields an
    // opaque 400.
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: keycloakConfig.clientId,
      username: email,
      password,
      scope: 'openid profile email',
    });

    const response = await fetchWithTimeout(keycloakConfig.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      // Keycloak answers 401/invalid_grant for a wrong password AND for a
      // disabled account, so the message stays deliberately vague.
      if (response.status === 401 || errorData?.error === 'invalid_grant') {
        return { success: false, error: 'Invalid email or password' };
      }
      return {
        success: false,
        error: errorData?.error_description ?? 'Login failed. Please try again.',
      };
    }

    const tokens = parseTokenResponse(await response.json());
    await saveTokens(tokens);
    return { success: true, tokens };
  } catch (err) {
    return { success: false, error: networkErrorMessage(err) };
  }
}

/** Exchanges the code returned by the browser (PKCE) flow for tokens. */
export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<AuthResult> {
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: keycloakConfig.clientId,
      code,
      // Must byte-match the redirect_uri sent to /auth.
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetchWithTimeout(keycloakConfig.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.error_description ?? 'Sign-in failed. Please try again.',
      };
    }

    const tokens = parseTokenResponse(await response.json());
    await saveTokens(tokens);
    return { success: true, tokens };
  } catch (err) {
    return { success: false, error: networkErrorMessage(err) };
  }
}

/**
 * Listeners told when the refresh token is rejected — the session is over on
 * the server, so the app must drop everything it holds for that rider, not
 * just the tokens. `AuthProvider` subscribes and runs its sign-out cleanup.
 */
const sessionEndedListeners = new Set<() => void>();

export function onSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener);
  return () => {
    sessionEndedListeners.delete(listener);
  };
}

/** The refresh in flight, shared by every caller that needs one meanwhile. */
let refreshInFlight: Promise<AuthResult> | null = null;

/**
 * Refreshes the session. Single-flight: with refresh-token rotation on the
 * realm, two parallel refreshes would spend the same token twice — Keycloak
 * rejects the second and the rider is logged out for no reason. Concurrent
 * callers (REST interceptor, STOMP reconnect, userinfo) share one request.
 *
 * On rejection the stored tokens are cleared and listeners are told, so the
 * app drops to the login screen instead of retrying a dead session forever.
 * Rotated refresh tokens are persisted by saveTokens.
 */
export function refreshAccessToken(): Promise<AuthResult> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<AuthResult> {
  try {
    const currentTokens = await getTokens();
    if (!currentTokens?.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: keycloakConfig.clientId,
      refresh_token: currentTokens.refreshToken,
    });

    const response = await fetchWithTimeout(keycloakConfig.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      await clearTokens();
      sessionEndedListeners.forEach((listener) => listener());
      return { success: false, error: 'Session expired. Please log in again.' };
    }

    const tokens = parseTokenResponse(await response.json());
    await saveTokens(tokens);
    return { success: true, tokens };
  } catch (err) {
    // A network failure is not a rejected session: keep the tokens and let
    // the next call try again.
    return { success: false, error: networkErrorMessage(err) };
  }
}

/** Current user's claims, retrying once through a refresh on a 401. */
export async function fetchUserInfo(): Promise<KeycloakUserInfo | null> {
  try {
    const tokens = await getTokens();
    if (!tokens?.accessToken) return null;

    const response = await fetchWithTimeout(keycloakConfig.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (response.ok) return response.json();

    if (response.status === 401) {
      const refreshResult = await refreshAccessToken();
      if (refreshResult.success && refreshResult.tokens) {
        const retry = await fetchWithTimeout(keycloakConfig.userInfoEndpoint, {
          headers: { Authorization: `Bearer ${refreshResult.tokens.accessToken}` },
        });
        if (retry.ok) return retry.json();
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    const tokens = await getTokens();
    if (tokens?.refreshToken) {
      const body = new URLSearchParams({
        client_id: keycloakConfig.clientId,
        refresh_token: tokens.refreshToken,
      });
      // Without id_token_hint only the refresh token is revoked: the browser
      // SSO session survives, so "log out → Continue with Google" would
      // silently sign the same account back in with no account picker.
      if (tokens.idToken) {
        body.set('id_token_hint', tokens.idToken);
      }
      await fetchWithTimeout(keycloakConfig.endSessionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }).catch(() => {}); // a network failure must not block local sign-out
    }
  } finally {
    await clearTokens();
  }
}

/**
 * The payload of a JWT. JWTs are base64url without padding; `atob` needs
 * standard base64 *with* padding, and Hermes throws without it — which made
 * every token read as expired and forced a refresh on every request.
 *
 * This only reads claims for scheduling (expiry) and display. It does not
 * verify the signature and must never be used to grant access: the backend
 * validates every token it receives.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Refresh this long before the real expiry, so a token never lapses between
 * the check and the server reading it (request latency, clock drift).
 */
const EXPIRY_SKEW_MS = 30_000;

/** Local expiry check, so the app can refresh proactively instead of on a 401. */
export function isTokenExpired(token: string): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== 'number') return true; // unparseable → treat as expired
  return Date.now() >= exp * 1000 - EXPIRY_SKEW_MS;
}
