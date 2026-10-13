import { SessionExpiredError } from './session-manager';
import { ana, apiSession, createFakeSession } from './session-test-utils';

import { ApiError, NetworkError } from '@/lib/api-client';

// The shared instance created by the module is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

describe('session manager', () => {
  it('starts in the loading state', () => {
    expect(createFakeSession().manager.getState()).toEqual({ status: 'loading' });
  });

  describe('restore', () => {
    it('is signed out when there is no saved session', async () => {
      const { manager, api } = createFakeSession();

      await manager.restore();

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(api.refreshSession).not.toHaveBeenCalled();
    });

    it('recovers the saved session and stores the rotated token', async () => {
      const { manager, api, storedRefreshToken } = createFakeSession('refresh-0');
      api.refreshSession.mockResolvedValue(apiSession(1));

      await manager.restore();

      expect(api.refreshSession).toHaveBeenCalledWith('refresh-0');
      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
      expect(storedRefreshToken()).toBe('refresh-1');
    });

    it('signs out and forgets the token when the server rejects it', async () => {
      const { manager, api, storedRefreshToken } = createFakeSession('refresh-0');
      api.refreshSession.mockRejectedValue(new ApiError(401));

      await manager.restore();

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
    });

    it.each([
      ['there is no connection', new NetworkError()],
      ['the server fails', new ApiError(500)],
    ])('keeps the saved token when %s', async (_case, error) => {
      const { manager, api, storedRefreshToken } = createFakeSession('refresh-0');
      api.refreshSession.mockRejectedValue(error);

      await manager.restore();

      expect(manager.getState()).toEqual({ status: 'unavailable' });
      expect(storedRefreshToken()).toBe('refresh-0');
    });

    it('recovers the session on a later retry', async () => {
      const { manager, api } = createFakeSession('refresh-0');
      api.refreshSession.mockRejectedValueOnce(new NetworkError());
      api.refreshSession.mockResolvedValueOnce(apiSession(1));

      await manager.restore();
      await manager.restore();

      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
    });
  });

  describe('signIn', () => {
    it('starts a session with the Google ID token', async () => {
      const { manager, api, storedRefreshToken } = createFakeSession();
      api.signInWithGoogle.mockResolvedValue(apiSession(1));

      await expect(manager.signIn()).resolves.toEqual({ ok: true });

      expect(api.signInWithGoogle).toHaveBeenCalledWith('google-id-token');
      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
      expect(storedRefreshToken()).toBe('refresh-1');
    });

    it('stays signed out when the user cancels', async () => {
      const { manager, api, google } = createFakeSession();
      await manager.restore();
      google.requestGoogleIdToken.mockResolvedValue({ type: 'cancelled' });

      await expect(manager.signIn()).resolves.toEqual({ ok: false, reason: 'cancelled' });

      expect(api.signInWithGoogle).not.toHaveBeenCalled();
      expect(manager.getState()).toEqual({ status: 'signedOut' });
    });

    it.each([
      ['unavailable', 'unavailable'],
      ['play-services', 'play-services'],
      ['unknown', 'unknown'],
      ['in-progress', 'cancelled'],
    ] as const)('maps the Google error "%s" to "%s"', async (googleReason, reason) => {
      const { manager, google } = createFakeSession();
      google.requestGoogleIdToken.mockResolvedValue({ type: 'error', reason: googleReason });

      await expect(manager.signIn()).resolves.toEqual({ ok: false, reason });
    });

    it.each([
      ['network', new NetworkError()],
      ['rejected', new ApiError(401)],
      ['unknown', new ApiError(500)],
      ['unknown', new Error('unexpected response shape')],
    ] as const)('reports "%s" when the API call fails', async (reason, error) => {
      const { manager, api, google, storedRefreshToken } = createFakeSession();
      await manager.restore();
      api.signInWithGoogle.mockRejectedValue(error);

      await expect(manager.signIn()).resolves.toEqual({ ok: false, reason });

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
      expect(google.signOutFromGoogle).toHaveBeenCalled();
    });

    it('can be retried after a failure', async () => {
      const { manager, api } = createFakeSession();
      api.signInWithGoogle.mockRejectedValueOnce(new NetworkError());
      api.signInWithGoogle.mockResolvedValueOnce(apiSession(1));

      await manager.signIn();

      await expect(manager.signIn()).resolves.toEqual({ ok: true });
      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
    });
  });

  describe('signInWithPassword', () => {
    it('starts a session with the email and the password', async () => {
      const { manager, api, storedRefreshToken } = createFakeSession();
      api.signInWithPassword.mockResolvedValue(apiSession(1));

      await expect(manager.signInWithPassword('ana@example.com', 'correct horse')).resolves.toEqual(
        { ok: true },
      );

      expect(api.signInWithPassword).toHaveBeenCalledWith('ana@example.com', 'correct horse');
      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
      expect(storedRefreshToken()).toBe('refresh-1');
    });

    it.each([
      ['invalid-credentials', new ApiError(401)],
      ['rate-limited', new ApiError(429)],
      ['network', new NetworkError()],
      ['unknown', new ApiError(500)],
      ['unknown', new Error('unexpected response shape')],
    ] as const)('reports "%s" and stays signed out', async (reason, error) => {
      const { manager, api, storedRefreshToken } = createFakeSession();
      await manager.restore();
      api.signInWithPassword.mockRejectedValue(error);

      await expect(manager.signInWithPassword('ana@example.com', 'wrong')).resolves.toEqual({
        ok: false,
        reason,
      });

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
    });

    it('does not involve Google', async () => {
      const { manager, api, google } = createFakeSession();
      api.signInWithPassword.mockResolvedValue(apiSession(1));

      await manager.signInWithPassword('ana@example.com', 'correct horse');

      expect(google.requestGoogleIdToken).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registration = { name: 'Ana', email: 'ana@example.com', password: 'correct horse' };

    it('creates the account and starts its session', async () => {
      const { manager, api, storedRefreshToken } = createFakeSession();
      api.register.mockResolvedValue(apiSession(1));

      await expect(manager.register(registration)).resolves.toEqual({ ok: true });

      expect(api.register).toHaveBeenCalledWith(registration);
      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
      expect(storedRefreshToken()).toBe('refresh-1');
    });

    it.each([
      ['email-taken', new ApiError(409)],
      ['invalid-data', new ApiError(400)],
      ['rate-limited', new ApiError(429)],
      ['network', new NetworkError()],
      ['unknown', new ApiError(500)],
    ] as const)('reports "%s" and stays signed out', async (reason, error) => {
      const { manager, api, storedRefreshToken } = createFakeSession();
      await manager.restore();
      api.register.mockRejectedValue(error);

      await expect(manager.register(registration)).resolves.toEqual({ ok: false, reason });

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
    });
  });

  describe('signOut', () => {
    async function signedIn() {
      const fake = createFakeSession();
      fake.api.signInWithGoogle.mockResolvedValue(apiSession(1));
      await fake.manager.signIn();
      return fake;
    }

    it('ends the session on the device, the server and Google', async () => {
      const { manager, api, google, storedRefreshToken } = await signedIn();

      await manager.signOut();

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
      expect(api.signOut).toHaveBeenCalledWith('refresh-1');
      expect(google.signOutFromGoogle).toHaveBeenCalled();
    });

    it('still signs out on the device when the server cannot be reached', async () => {
      const { manager, api, google, storedRefreshToken } = await signedIn();
      api.signOut.mockRejectedValue(new NetworkError());
      google.signOutFromGoogle.mockRejectedValue(new Error('no account'));

      await expect(manager.signOut()).resolves.toBeUndefined();

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
    });

    it('requires signing in again for authorized requests', async () => {
      const { manager, api } = await signedIn();

      await manager.signOut();

      await expect(manager.authorizedRequest('/auth/me')).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
      expect(api.request).not.toHaveBeenCalled();
    });
  });

  describe('authorizedRequest', () => {
    async function signedIn() {
      const fake = createFakeSession();
      fake.api.signInWithGoogle.mockResolvedValue(apiSession(1));
      await fake.manager.signIn();
      return fake;
    }

    it('sends the access token of the session', async () => {
      const { manager, api } = await signedIn();
      api.request.mockResolvedValue(ana);

      await expect(manager.authorizedRequest('/auth/me')).resolves.toEqual(ana);

      expect(api.request).toHaveBeenCalledWith('/auth/me', { accessToken: 'access-1' });
    });

    it('renews the session and retries once after a 401', async () => {
      const { manager, api, storedRefreshToken } = await signedIn();
      api.request.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce(ana);
      api.refreshSession.mockResolvedValue(apiSession(2));

      await expect(manager.authorizedRequest('/auth/me')).resolves.toEqual(ana);

      expect(api.refreshSession).toHaveBeenCalledWith('refresh-1');
      expect(api.request).toHaveBeenLastCalledWith('/auth/me', { accessToken: 'access-2' });
      expect(storedRefreshToken()).toBe('refresh-2');
    });

    it('shares one renewal between concurrent requests', async () => {
      const { manager, api } = await signedIn();
      api.request.mockImplementation(async (_path, options) => {
        if (options?.accessToken === 'access-1') {
          throw new ApiError(401);
        }
        return ana;
      });
      api.refreshSession.mockResolvedValue(apiSession(2));

      await expect(
        Promise.all([
          manager.authorizedRequest('/a'),
          manager.authorizedRequest('/b'),
          manager.authorizedRequest('/c'),
        ]),
      ).resolves.toEqual([ana, ana, ana]);

      expect(api.refreshSession).toHaveBeenCalledTimes(1);
    });

    it('signs out when the session can no longer be renewed', async () => {
      const { manager, api, storedRefreshToken } = await signedIn();
      api.request.mockRejectedValue(new ApiError(401));
      api.refreshSession.mockRejectedValue(new ApiError(401));

      await expect(manager.authorizedRequest('/auth/me')).rejects.toBeInstanceOf(
        SessionExpiredError,
      );

      expect(manager.getState()).toEqual({ status: 'signedOut' });
      expect(storedRefreshToken()).toBeNull();
    });

    it('does not retry more than once', async () => {
      const { manager, api } = await signedIn();
      api.request.mockRejectedValue(new ApiError(401));
      api.refreshSession.mockResolvedValue(apiSession(2));

      await expect(manager.authorizedRequest('/auth/me')).rejects.toBeInstanceOf(ApiError);

      expect(api.request).toHaveBeenCalledTimes(2);
    });

    it('keeps the session when the request fails for another reason', async () => {
      const { manager, api } = await signedIn();
      api.request.mockRejectedValue(new NetworkError());

      await expect(manager.authorizedRequest('/auth/me')).rejects.toBeInstanceOf(NetworkError);

      expect(api.refreshSession).not.toHaveBeenCalled();
      expect(manager.getState()).toEqual({ status: 'signedIn', user: ana });
    });
  });

  it('notifies subscribers until they unsubscribe', async () => {
    const { manager } = createFakeSession();
    const listener = jest.fn();
    const unsubscribe = manager.subscribe(listener);

    await manager.restore();
    const calls = listener.mock.calls.length;
    unsubscribe();
    await manager.restore();

    expect(calls).toBeGreaterThan(0);
    expect(listener).toHaveBeenCalledTimes(calls);
  });
});
