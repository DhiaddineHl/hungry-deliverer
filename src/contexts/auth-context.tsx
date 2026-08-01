import { useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { driverQueryOptions } from '@/hooks/use-driver';
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
      extraParams: { kc_idp_hint: 'google' },
    },
    discovery
  );

  // Warm the driver record into the query cache as soon as we have an account
  // id, so every screen that reads the profile already has it.
  const prefetchDriver = useCallback(
    (sub?: string | null) => {
      if (sub) queryClient.prefetchQuery(driverQueryOptions(sub));
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
            prefetchDriver(userInfo?.sub);
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
    [redirectUri, prefetchDriver]
  );

  useEffect(() => {
    (async () => {
      try {
        const tokens = await getTokens();
        if (!tokens) {
          setState({ isAuthenticated: false, isLoading: false, user: null });
          return;
        }

        if (isTokenExpired(tokens.accessToken)) {
          const result = await refreshAccessToken();
          if (!result.success) {
            await clearTokens();
            setState({ isAuthenticated: false, isLoading: false, user: null });
            return;
          }
        }

        const userInfo = await fetchUserInfo();
        setState({ isAuthenticated: true, isLoading: false, user: userInfo });
        prefetchDriver(userInfo?.sub);
      } catch {
        setState({ isAuthenticated: false, isLoading: false, user: null });
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
        prefetchDriver(userInfo?.sub);
      }
      return result;
    },
    [prefetchDriver]
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
    await keycloakLogout();
    // Tokens alone are not enough: the persisted store and the query cache
    // outlive them and would leak one deliverer's data into the next session.
    useDriverStore.getState().clear();
    queryClient.clear();
    setState({ isAuthenticated: false, isLoading: false, user: null });
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
