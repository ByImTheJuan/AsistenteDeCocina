import { requestGoogleIdToken, signOutFromGoogle } from './google-sign-in';

// What importing the library does in a binary without its native module,
// such as Expo Go.
jest.mock('@react-native-google-signin/google-signin', () => {
  throw new Error(
    "TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found.",
  );
});

describe('Google sign-in without the native module', () => {
  it('reports that signing in is unavailable instead of crashing', async () => {
    await expect(requestGoogleIdToken()).resolves.toEqual({
      type: 'error',
      reason: 'unavailable',
    });
  });

  it('has no Google account to sign out', async () => {
    await expect(signOutFromGoogle()).resolves.toBeUndefined();
  });
});
