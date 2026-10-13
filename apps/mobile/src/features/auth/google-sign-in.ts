import { TurboModuleRegistry } from 'react-native';

import { getEnv } from '@/config/app-env';

export type GoogleSignInResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; reason: 'unavailable' | 'play-services' | 'in-progress' | 'unknown' };

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let configured = false;

// The library looks up its native module as soon as it is imported and fails
// when the binary does not include it: Expo Go, or a development build made
// before the dependency was added. It is therefore loaded on demand, and only
// once the native module is known to exist; `null` means it is not available.
function loadGoogleSignIn(): GoogleSignInModule | null {
  // Metro reports an error thrown while a module loads as fatal and makes
  // `require` return undefined, so a try/catch around it is not enough.
  if (!TurboModuleRegistry.get('RNGoogleSignin')) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const library: GoogleSignInModule = require('@react-native-google-signin/google-signin');
  if (!configured) {
    const env = getEnv();
    // The web client ID makes Google issue an ID token whose audience is the
    // backend, which is where the token is verified.
    library.GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      iosClientId: env.googleIosClientId,
    });
    configured = true;
  }
  return library;
}

/** Shows the native account picker and returns the Google ID token. */
export async function requestGoogleIdToken(): Promise<GoogleSignInResult> {
  const library = loadGoogleSignIn();
  if (!library) {
    return { type: 'error', reason: 'unavailable' };
  }
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = library;

  try {
    // Android only; resolves immediately on iOS.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return { type: 'cancelled' };
    }
    if (!response.data.idToken) {
      return { type: 'error', reason: 'unknown' };
    }
    return { type: 'success', idToken: response.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { type: 'cancelled' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { type: 'error', reason: 'play-services' };
        case statusCodes.IN_PROGRESS:
          return { type: 'error', reason: 'in-progress' };
      }
    }
    return { type: 'error', reason: 'unknown' };
  }
}

/** Forgets the Google account on the device so the next sign-in asks again. */
export async function signOutFromGoogle(): Promise<void> {
  const library = loadGoogleSignIn();
  await library?.GoogleSignin.signOut();
}
