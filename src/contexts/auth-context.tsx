import { useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { ensureDriverForAccount } from '@/hooks/use-driver';
import { clearPushRegistration } from '@/services/notifications/push-service';
import {
  exchangeAuthorizationCode,
  fetchUserInfo,
  isTokenExpired,
  logout as keycloakLogout,
  loginWithPassword,
  refreshAccessToken,
  type AuthResult,
  type KeycloakUserInfo,
} from '@/services/keycloak/auth-service';
import { keycloakConfig } from '@/services/keycloak/config';
import { clearTokens, getTokens } from '@/services/keycloak/token-storage';
import { useDriverStore } from '@/store/driver-store';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: KeycloakUserInfo | null;
}

interface AuthContextValue extends AuthState {
  /**
   * Whether the driver record behind the current session has been resolved —
   * read from the backend, or created for an account the app never registered
   * (see `ensureDriverForAccount`). A Google sign-in always lands here with no
   * record yet, so screens that read the profile can wait on this instead of
   * rendering an empty one.
   *
   * `true` with no record simply means the lookup finished and there is none.
   */
  isDriverResolved: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  // Registration deliberately lives outside this context: it is a backend
  // mutation (useRegisterDriver), because the backend — not the app — holds
  // the credentials that can create a Keycloak account.
  loginWithGoogle: () => Promise<AuthResult>;
  /**
   * Re-fetches the user info from Keycloak after a profile change (done via
   * the backend, which syncs the Keycloak account). `overrides` patches
   * claims userinfo does not return (e.g. `phoneNumber` unless mapped).
   */
  reloadUser: (overrides?: Partial<KeycloakUserInfo>) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** True when the user simply dismissed the browser — not an error to show. */
export function wasCancelled(error?: string): boolean {
  return !!error && error.toLowerCase().includes('cancel');
}

// Discovery for the browser-based Authorization Code + PKCE flow.
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: keycloakConfig.authorizationEndpoint,
  tokenEndpoint: keycloakConfig.tokenEndpoint,
  endSessionEndpoint: keycloakConfig.endSessionEndpoint,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    // Starts true so the router guard waits for the stored session to be
    // restored instead of flashing the login screen on every cold start.
    isLoading: true,
    user: null,
  });
  const [isDriverResolved, setIsDriverResolved] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'hungrydeliverer',
    path: 'auth/callback',
  });

  // The exact value below must be listed in the Keycloak client's "Valid
  // redirect URIs". If Keycloak answers "Invalid parameter: redirect_uri",
  // copy this string verbatim into that list — in Expo Go it is an exp://…
  // URL, not hungrydeliverer://.
  console.log('[Auth] OAuth redirect_uri =', redirectUri);

  // Browser-based Authorization Code + PKCE flow, jumping straight to Google.
  const [googleRequest, , promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: keycloakConfig.clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
      // Without this Keycloak silently resumes its own browser SSO session —
      // the KEYCLOAK_IDENTITY cookie outlives our back-channel logout, which
      // only revokes the refresh token — so "Continue with Google" would
      // re-authenticate the previous deliverer with no chance to switch.
      // Keycloak must ALSO forward an account chooser to Google (Identity
      // providers > google > Advanced > Prompt = "select_account"), or Google
      // auto-selects its remembered account on the next hop.
      prompt: AuthSession.Prompt.Login,
      extraParams: { kc_idp_hint: 'google' },
    },
    discovery
  );

  // Warm the driver record into the query cache as soon as we have an account
  // id, so every screen that reads the profile already has it — creating the
  // record first when the account has none, which is the normal state of a
  // Google sign-in (Keycloak provisions those accounts itself, so nothing ever
  // registered them with the backend).
  //
  // Fire-and-forget on purpose: the session is already valid, so a backend
  // hiccup here must not lock the deliverer out of the app. Screens that need
  // the record refetch it through `useDriver`.
  const ensureDriver = useCallback(
    (sub?: string | null) => {
      if (!sub) {
        setIsDriverResolved(true);
        return;
      }
      setIsDriverResolved(false);
      ensureDriverForAccount(queryClient, sub)
        .catch((error) => {
          console.warn('[Auth] Could not resolve the driver record:', error);
        })
        .finally(() => setIsDriverResolved(true));
    },
    [queryClient]
  );

  // Drives a browser auth request to completion: prompt, then exchange the
  // returned authorization code (+ PKCE verifier) for tokens and load the user.
  const runBrowserAuth = useCallback(
    async (
      request: AuthSession.AuthRequest | null,
      promptAsync: () => Promise<AuthSession.AuthSessionResult>
    ): Promise<AuthResult> => {
      if (!request) {
        return { success: false, error: 'Authentication is not available yet. Please try again.' };
      }
      try {
        const result = await promptAsync();
        if (result.type === 'success' && result.params.code && request.codeVerifier) {
          const tokenResult = await exchangeAuthorizationCode(
            result.params.code,
            request.codeVerifier,
            redirectUri
          );
          if (tokenResult.success) {
            const userInfo = await fetchUserInfo();
            setState({ isAuthenticated: true, isLoading: false, user: userInfo });
            ensureDriver(userInfo?.sub);
          }
          return tokenResult;
        }
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { success: false, error: 'Authentication was cancelled' };
        }
        return { success: false, error: 'Authentication failed' };
      } catch {
        return { success: false, error: 'Authentication failed. Please try again.' };
      }
    },
    [redirectUri, ensureDriver]
  );

  useEffect(() => {
    (async () => {
      try {
        const tokens = await getTokens();
        if (!tokens) {
          setState({ isAuthenticated: false, isLoading: false, user: null });
          setIsDriverResolved(true);
          return;
        }

        if (isTokenExpired(tokens.accessToken)) {
          const result = await refreshAccessToken();
          if (!result.success) {
            await clearTokens();
            setState({ isAuthenticated: false, isLoading: false, user: null });
            setIsDriverResolved(true);
            return;
          }
        }

        const userInfo = await fetchUserInfo();
        setState({ isAuthenticated: true, isLoading: false, user: userInfo });
        ensureDriver(userInfo?.sub);
      } catch {
        setState({ isAuthenticated: false, isLoading: false, user: null });
        setIsDriverResolved(true);
      }
    })();
    // Runs once on mount — the router guard keys off isLoading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const result = await loginWithPassword(email, password);
      if (result.success) {
        const userInfo = await fetchUserInfo();
        setState({ isAuthenticated: true, isLoading: false, user: userInfo });
        ensureDriver(userInfo?.sub);
      }
      return result;
    },
    [ensureDriver]
  );

  const loginWithGoogleFn = useCallback(
    (): Promise<AuthResult> => runBrowserAuth(googleRequest, promptGoogleAsync),
    [runBrowserAuth, googleRequest, promptGoogleAsync]
  );

  const reloadUser = useCallback(async (overrides?: Partial<KeycloakUserInfo>) => {
    const refreshed = await fetchUserInfo();
    setState((prev) => {
      const base = refreshed ?? prev.user;
      if (!base) return prev;
      return { ...prev, user: { ...base, ...overrides } };
    });
  }, []);

  const logoutFn = useCallback(async () => {
    // Must run before the session is cleared — the request is authenticated,
    // so once the tokens are gone the backend can no longer tell whose
    // device this is (see push-service.ts's own comment).
    await clearPushRegistration();
    await keycloakLogout();
    // Tokens alone are not enough: the persisted store and the query cache
    // outlive them and would leak one deliverer's data into the next session.
    useDriverStore.getState().clear();
    queryClient.clear();
    setState({ isAuthenticated: false, isLoading: false, user: null });
    setIsDriverResolved(false);
  }, [queryClient]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const result = await refreshAccessToken();
    if (!result.success) {
      setState({ isAuthenticated: false, isLoading: false, user: null });
    }
    return result.success;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isDriverResolved,
        login,
        loginWithGoogle: loginWithGoogleFn,
        reloadUser,
        logout: logoutFn,
        refreshSession,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
