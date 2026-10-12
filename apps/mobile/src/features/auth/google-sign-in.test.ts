import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { requestGoogleIdToken, signOutFromGoogle } from './google-sign-in';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
  isSuccessResponse: (response: { type: string }) => response.type === 'success',
}));

const mocked = jest.mocked(GoogleSignin);

function successResponse(idToken: string | null) {
  return { type: 'success', data: { idToken } } as Awaited<ReturnType<typeof GoogleSignin.signIn>>;
}

function nativeError(code: string) {
  return Object.assign(new Error(code), { code });
}

describe('requestGoogleIdToken', () => {
  beforeEach(() => {
    mocked.hasPlayServices.mockReset().mockResolvedValue(true);
    mocked.signIn.mockReset();
    mocked.signOut.mockReset().mockResolvedValue(null);
  });

  it('returns the ID token of the chosen account', async () => {
    mocked.signIn.mockResolvedValue(successResponse('google-id-token'));

    await expect(requestGoogleIdToken()).resolves.toEqual({
      type: 'success',
      idToken: 'google-id-token',
    });
  });

  it('asks Google for a token addressed to the backend', async () => {
    mocked.signIn.mockResolvedValue(successResponse('google-id-token'));

    await requestGoogleIdToken();

    expect(mocked.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      iosClientId: 'ios-client-id.apps.googleusercontent.com',
    });
  });

  it('reports a cancellation when the user closes the picker', async () => {
    mocked.signIn.mockResolvedValue({ type: 'cancelled', data: null });

    await expect(requestGoogleIdToken()).resolves.toEqual({ type: 'cancelled' });
  });

  it('reports a cancellation raised as a native error', async () => {
    mocked.signIn.mockRejectedValue(nativeError('SIGN_IN_CANCELLED'));

    await expect(requestGoogleIdToken()).resolves.toEqual({ type: 'cancelled' });
  });

  it('reports missing Google Play Services', async () => {
    mocked.hasPlayServices.mockRejectedValue(nativeError('PLAY_SERVICES_NOT_AVAILABLE'));

    await expect(requestGoogleIdToken()).resolves.toEqual({
      type: 'error',
      reason: 'play-services',
    });
    expect(mocked.signIn).not.toHaveBeenCalled();
  });

  it('reports a sign-in that is already in progress', async () => {
    mocked.signIn.mockRejectedValue(nativeError('IN_PROGRESS'));

    await expect(requestGoogleIdToken()).resolves.toEqual({
      type: 'error',
      reason: 'in-progress',
    });
  });

  it('reports an unknown error when Google returns no ID token', async () => {
    mocked.signIn.mockResolvedValue(successResponse(null));

    await expect(requestGoogleIdToken()).resolves.toEqual({ type: 'error', reason: 'unknown' });
  });

  it.each([nativeError('DEVELOPER_ERROR'), new Error('boom')])(
    'reports an unknown error for %p',
    async (error) => {
      mocked.signIn.mockRejectedValue(error);

      await expect(requestGoogleIdToken()).resolves.toEqual({ type: 'error', reason: 'unknown' });
    },
  );
});

describe('signOutFromGoogle', () => {
  it('signs the Google account out of the device', async () => {
    mocked.signOut.mockResolvedValue(null);

    await signOutFromGoogle();

    expect(mocked.signOut).toHaveBeenCalledTimes(1);
  });
});
