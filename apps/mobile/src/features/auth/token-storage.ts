import * as SecureStore from 'expo-secure-store';

// Keychain on iOS and Keystore-backed storage on Android. Only the refresh
// token is persisted; the access token lives in memory.
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
