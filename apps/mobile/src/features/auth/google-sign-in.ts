import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { env } from '@/config/app-env';

export type GoogleSignInResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; reason: 'play-services' | 'in-progress' | 'unknown' };

let configured = false;

function configure(): void {
  if (configured) {
    return;
  }
  // The web client ID makes Google issue an ID token whose audience is the
  // backend, which is where the token is verified.
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
  });
  configured = true;
}

/** Shows the native account picker and returns the Google ID token. */
export async function requestGoogleIdToken(): Promise<GoogleSignInResult> {
  try {
    configure();
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
  configure();
  await GoogleSignin.signOut();
}
