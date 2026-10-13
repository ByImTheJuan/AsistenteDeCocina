import * as authApi from './auth-api';
import type { ApiSession, Registration, User } from './auth-api';
import * as google from './google-sign-in';
import type { GoogleSignInResult } from './google-sign-in';
import * as tokenStorage from './token-storage';

import { ApiError, apiRequest, NetworkError } from '@/lib/api-client';
import type { ApiRequestOptions } from '@/lib/api-client';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }
  // A saved session exists but the API could not be reached to renew it.
  | { status: 'unavailable' };

export type SignInFailure =
  | 'cancelled'
  | 'unavailable'
  | 'play-services'
  | 'network'
  | 'rejected'
  | 'unknown';

export type PasswordSignInFailure = 'invalid-credentials' | 'rate-limited' | 'network' | 'unknown';

export type RegisterFailure =
  | 'email-taken'
  | 'invalid-data'
  | 'rate-limited'
  | 'network'
  | 'unknown';

type Result<Failure> = { ok: true } | { ok: false; reason: Failure };

export type SignInResult = Result<SignInFailure>;
export type PasswordSignInResult = Result<PasswordSignInFailure>;
export type RegisterResult = Result<RegisterFailure>;

export class SessionExpiredError extends Error {
  constructor() {
    super('The session has expired');
    this.name = 'SessionExpiredError';
  }
}

export type SessionDependencies = {
  api: {
    signInWithGoogle(idToken: string): Promise<ApiSession>;
    signInWithPassword(email: string, password: string): Promise<ApiSession>;
    register(registration: Registration): Promise<ApiSession>;
    refreshSession(refreshToken: string): Promise<ApiSession>;
    signOut(refreshToken: string): Promise<void>;
    request(path: string, options?: ApiRequestOptions): Promise<unknown>;
  };
  storage: {
    getRefreshToken(): Promise<string | null>;
    setRefreshToken(token: string): Promise<void>;
    clearRefreshToken(): Promise<void>;
  };
  google: {
    requestGoogleIdToken(): Promise<GoogleSignInResult>;
    signOutFromGoogle(): Promise<void>;
  };
};

export type SessionManager = ReturnType<typeof createSessionManager>;

const defaultDependencies: SessionDependencies = {
  api: { ...authApi, request: apiRequest },
  storage: tokenStorage,
  google,
};

function commonFailure(error: unknown): 'rate-limited' | 'network' | 'unknown' {
  if (error instanceof NetworkError) {
    return 'network';
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'rate-limited';
  }
  return 'unknown';
}

export function createSessionManager({
  api,
  storage,
  google: googleSignIn,
}: SessionDependencies = defaultDependencies) {
  let state: SessionState = { status: 'loading' };
  let accessToken: string | undefined;
  let renewal: Promise<void> | undefined;
  const listeners = new Set<() => void>();

  function setState(next: SessionState): void {
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function startSession(session: ApiSession): Promise<void> {
    await storage.setRefreshToken(session.refreshToken);
    accessToken = session.accessToken;
    setState({ status: 'signedIn', user: session.user });
  }

  async function endSession(): Promise<void> {
    accessToken = undefined;
    await storage.clearRefreshToken();
    setState({ status: 'signedOut' });
  }

  async function renew(): Promise<void> {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) {
      await endSession();
      throw new SessionExpiredError();
    }
    try {
      await startSession(await api.refreshSession(refreshToken));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await endSession();
        throw new SessionExpiredError();
      }
      throw error;
    }
  }

  // Refresh tokens are single use, so concurrent callers must share one
  // renewal: a second request with the same token would end the session.
  function renewOnce(): Promise<void> {
    renewal ??= renew().finally(() => {
      renewal = undefined;
    });
    return renewal;
  }

  return {
    getState: (): SessionState => state,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Recovers the saved session when the app starts. */
    async restore(): Promise<void> {
      setState({ status: 'loading' });
      try {
        await renewOnce();
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          return;
        }
        // The saved token is kept: it may still be valid once the API is back.
        setState({ status: 'unavailable' });
      }
    },

    async signIn(): Promise<SignInResult> {
      const result = await googleSignIn.requestGoogleIdToken();
      if (result.type === 'cancelled') {
        return { ok: false, reason: 'cancelled' };
      }
      if (result.type === 'error') {
        // "in-progress" means a picker is already open; nothing to report.
        return {
          ok: false,
          reason: result.reason === 'in-progress' ? 'cancelled' : result.reason,
        };
      }

      try {
        await startSession(await api.signInWithGoogle(result.idToken));
        return { ok: true };
      } catch (error) {
        // Without this the next attempt would silently reuse the same account.
        await googleSignIn.signOutFromGoogle().catch(() => undefined);
        if (error instanceof NetworkError) {
          return { ok: false, reason: 'network' };
        }
        if (error instanceof ApiError && error.status === 401) {
          return { ok: false, reason: 'rejected' };
        }
        return { ok: false, reason: 'unknown' };
      }
    },

    async signInWithPassword(email: string, password: string): Promise<PasswordSignInResult> {
      try {
        await startSession(await api.signInWithPassword(email, password));
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return { ok: false, reason: 'invalid-credentials' };
        }
        return { ok: false, reason: commonFailure(error) };
      }
    },

    async register(registration: Registration): Promise<RegisterResult> {
      try {
        await startSession(await api.register(registration));
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          return { ok: false, reason: 'email-taken' };
        }
        if (error instanceof ApiError && error.status === 400) {
          return { ok: false, reason: 'invalid-data' };
        }
        return { ok: false, reason: commonFailure(error) };
      }
    },

    async signOut(): Promise<void> {
      const refreshToken = await storage.getRefreshToken();
      await endSession();
      // Signing out locally must work offline. If these calls fail, the
      // refresh token simply expires on the server without being used again.
      if (refreshToken) {
        await api.signOut(refreshToken).catch(() => undefined);
      }
      await googleSignIn.signOutFromGoogle().catch(() => undefined);
    },

    /** Calls the API as the signed-in user, renewing the session once on a 401. */
    async authorizedRequest(
      path: string,
      options: Omit<ApiRequestOptions, 'accessToken'> = {},
    ): Promise<unknown> {
      if (!accessToken) {
        await renewOnce();
      }
      try {
        return await api.request(path, { ...options, accessToken });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }
      }
      await renewOnce();
      return api.request(path, { ...options, accessToken });
    },
  };
}

export const sessionManager = createSessionManager();
