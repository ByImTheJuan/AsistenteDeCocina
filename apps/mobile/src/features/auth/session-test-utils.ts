import type { ApiSession, User } from './auth-api';
import type { GoogleSignInResult } from './google-sign-in';
import { createSessionManager } from './session-manager';

import type { ApiRequestOptions } from '@/lib/api-client';

// Test doubles for everything the session manager talks to, so tests can run
// the real manager without a network, a keychain or Google.

export const ana: User = {
  id: 'user-1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
};

export function apiSession(suffix: string | number = 1): ApiSession {
  return { accessToken: `access-${suffix}`, refreshToken: `refresh-${suffix}`, user: ana };
}

export function createFakeSession(initialRefreshToken: string | null = null) {
  let refreshToken = initialRefreshToken;

  const api = {
    signInWithGoogle: jest.fn<Promise<ApiSession>, [string]>(),
    refreshSession: jest.fn<Promise<ApiSession>, [string]>(),
    signOut: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    request: jest.fn<Promise<unknown>, [string, ApiRequestOptions?]>(),
  };
  const storage = {
    getRefreshToken: jest.fn(async () => refreshToken),
    setRefreshToken: jest.fn(async (token: string) => {
      refreshToken = token;
    }),
    clearRefreshToken: jest.fn(async () => {
      refreshToken = null;
    }),
  };
  const google = {
    requestGoogleIdToken: jest
      .fn<Promise<GoogleSignInResult>, []>()
      .mockResolvedValue({ type: 'success', idToken: 'google-id-token' }),
    signOutFromGoogle: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  };

  return {
    api,
    storage,
    google,
    manager: createSessionManager({ api, storage, google }),
    storedRefreshToken: () => refreshToken,
  };
}
