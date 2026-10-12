import { render, screen, userEvent } from '@testing-library/react-native';

import { SessionProvider } from './session-provider';
import { apiSession, createFakeSession } from './session-test-utils';
import { SignInScreen } from './sign-in-screen';

import { ApiError, NetworkError } from '@/lib/api-client';

// The shared instance created by the module is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

type FakeSession = ReturnType<typeof createFakeSession>;

async function renderScreen(fake: FakeSession) {
  await render(
    <SessionProvider manager={fake.manager}>
      <SignInScreen />
    </SessionProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('SignInScreen', () => {
  const user = userEvent.setup();

  it('offers to sign in with Google when there is no session', async () => {
    await renderScreen(createFakeSession());

    expect(
      await screen.findByRole('button', { name: 'Continuar con Google' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('shows progress while the saved session is being recovered', async () => {
    const fake = createFakeSession('refresh-0');
    const pending = deferred<ReturnType<typeof apiSession>>();
    fake.api.refreshSession.mockReturnValue(pending.promise);

    await renderScreen(fake);

    expect(await screen.findByLabelText('Recuperando tu sesión')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeOnTheScreen();
  });

  it('disables the button while signing in', async () => {
    const fake = createFakeSession();
    const pending = deferred<ReturnType<typeof apiSession>>();
    fake.api.signInWithGoogle.mockReturnValue(pending.promise);
    await renderScreen(fake);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeBusy();
  });

  it('signs in without showing any error', async () => {
    const fake = createFakeSession();
    fake.api.signInWithGoogle.mockResolvedValue(apiSession());
    await renderScreen(fake);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(fake.manager.getState().status).toBe('signedIn');
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('explains that the sign-in was cancelled and lets the user try again', async () => {
    const fake = createFakeSession();
    fake.google.requestGoogleIdToken.mockResolvedValueOnce({ type: 'cancelled' });
    fake.api.signInWithGoogle.mockResolvedValue(apiSession());
    await renderScreen(fake);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Has cancelado el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.',
    );
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();

    await user.press(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(fake.manager.getState().status).toBe('signedIn');
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it.each([
    [
      'the server cannot be reached',
      new NetworkError(),
      'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
    ],
    [
      'the server rejects the Google account',
      new ApiError(401),
      'No hemos podido verificar tu cuenta de Google. Inténtalo de nuevo.',
    ],
    [
      'the server fails',
      new ApiError(500),
      'Ha ocurrido un error inesperado al iniciar sesión. Inténtalo de nuevo.',
    ],
  ])('shows a clear message when %s', async (_case, error, message) => {
    const fake = createFakeSession();
    fake.api.signInWithGoogle.mockRejectedValue(error);
    await renderScreen(fake);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();
  });

  it('explains that Google Play Services is missing', async () => {
    const fake = createFakeSession();
    fake.google.requestGoogleIdToken.mockResolvedValue({ type: 'error', reason: 'play-services' });
    await renderScreen(fake);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google Play Services no está disponible o necesita actualizarse en este dispositivo.',
    );
  });

  it('clears the previous error when the user tries again', async () => {
    const fake = createFakeSession();
    fake.api.signInWithGoogle.mockRejectedValueOnce(new NetworkError());
    const pending = deferred<ReturnType<typeof apiSession>>();
    fake.api.signInWithGoogle.mockReturnValueOnce(pending.promise);
    await renderScreen(fake);
    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));
    await screen.findByRole('alert');

    await user.press(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('offers to retry when the saved session cannot be recovered offline', async () => {
    const fake = createFakeSession('refresh-0');
    fake.api.refreshSession.mockRejectedValueOnce(new NetworkError());
    fake.api.refreshSession.mockResolvedValueOnce(apiSession());
    await renderScreen(fake);

    expect(await screen.findByText('Sin conexión')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(fake.manager.getState().status).toBe('signedIn');
  });
});
