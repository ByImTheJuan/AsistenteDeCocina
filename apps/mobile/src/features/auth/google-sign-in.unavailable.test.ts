import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { TurboModuleRegistry } from 'react-native';

import { requestGoogleIdToken, signOutFromGoogle } from './google-sign-in';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn(), signOut: jest.fn() },
}));

// A binary without the native module: Expo Go, or a development build made
// before the dependency was added. Loading the library there is a fatal error,
// so it must not even be required.
describe('Google sign-in without the native module', () => {
  beforeEach(() => {
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(null);
  });

  it('reports that signing in is unavailable instead of crashing', async () => {
    await expect(requestGoogleIdToken()).resolves.toEqual({
      type: 'error',
      reason: 'unavailable',
    });

    expect(TurboModuleRegistry.get).toHaveBeenCalledWith('RNGoogleSignin');
    expect(GoogleSignin.configure).not.toHaveBeenCalled();
    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  });

  it('has no Google account to sign out', async () => {
    await expect(signOutFromGoogle()).resolves.toBeUndefined();

    expect(GoogleSignin.signOut).not.toHaveBeenCalled();
  });
});
