import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'keycloak_access_token';
const REFRESH_TOKEN_KEY = 'keycloak_refresh_token';
const ID_TOKEN_KEY = 'keycloak_id_token';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Kept because a full logout needs it as `id_token_hint`. */
  idToken?: string;
}

// SecureStore has no web implementation, so the web build falls back to
// localStorage. That is XSS-readable — acceptable for the dev web preview,
// not for a shipped web build.
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveTokens(tokens: TokenSet): Promise<void> {
  await setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  await setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.idToken) {
    await setItem(ID_TOKEN_KEY, tokens.idToken);
  }
}

export async function getTokens(): Promise<TokenSet | null> {
  const [accessToken, refreshToken, idToken] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
    getItem(ID_TOKEN_KEY),
  ]);

  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken, idToken: idToken ?? undefined };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(ID_TOKEN_KEY),
  ]);
}
