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

  describe('with email and password', () => {
    async function fillAndSubmit(email: string, password: string) {
      if (email) await user.type(await screen.findByLabelText('Email'), email);
      if (password) await user.type(screen.getByLabelText('Contraseña'), password);
      await user.press(await screen.findByRole('button', { name: 'Iniciar sesión' }));
    }

    it('signs in', async () => {
      const fake = createFakeSession();
      fake.api.signInWithPassword.mockResolvedValue(apiSession());
      await renderScreen(fake);

      await fillAndSubmit('ana@example.com', 'correct horse');

      expect(fake.api.signInWithPassword).toHaveBeenCalledWith('ana@example.com', 'correct horse');
      expect(fake.manager.getState().status).toBe('signedIn');
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });

    it('hides the password while it is typed', async () => {
      await renderScreen(createFakeSession());

      expect(await screen.findByLabelText('Contraseña')).toHaveProp('secureTextEntry', true);
    });

    it('asks for the email and the password before calling the server', async () => {
      const fake = createFakeSession();
      await renderScreen(fake);

      await fillAndSubmit('', '');

      expect(await screen.findByText('Escribe tu email.')).toBeOnTheScreen();
      expect(screen.getByText('Escribe tu contraseña.')).toBeOnTheScreen();
      expect(fake.api.signInWithPassword).not.toHaveBeenCalled();
    });

    it('rejects a malformed email before calling the server', async () => {
      const fake = createFakeSession();
      await renderScreen(fake);

      await fillAndSubmit('ana-at-example.com', 'correct horse');

      expect(await screen.findByText('Escribe un email válido.')).toBeOnTheScreen();
      expect(fake.api.signInWithPassword).not.toHaveBeenCalled();
    });

    it.each([
      ['the credentials are wrong', new ApiError(401), 'El email o la contraseña no son correctos.'],
      [
        'there are too many attempts',
        new ApiError(429),
        'Has hecho demasiados intentos. Espera un minuto y vuelve a intentarlo.',
      ],
      [
        'the server cannot be reached',
        new NetworkError(),
        'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
      ],
    ])('shows a clear message when %s', async (_case, error, message) => {
      const fake = createFakeSession();
      fake.api.signInWithPassword.mockRejectedValue(error);
      await renderScreen(fake);

      await fillAndSubmit('ana@example.com', 'wrong password');

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    });

    it('can be retried after wrong credentials', async () => {
      const fake = createFakeSession();
      fake.api.signInWithPassword.mockRejectedValueOnce(new ApiError(401));
      fake.api.signInWithPassword.mockResolvedValueOnce(apiSession());
      await renderScreen(fake);
      await fillAndSubmit('ana@example.com', 'wrong');
      await screen.findByRole('alert');

      await user.type(screen.getByLabelText('Contraseña'), ' horse');
      await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

      expect(fake.api.signInWithPassword).toHaveBeenLastCalledWith('ana@example.com', 'wrong horse');
      expect(fake.manager.getState().status).toBe('signedIn');
    });

    it('blocks both ways of signing in while one is in progress', async () => {
      const fake = createFakeSession();
      const pending = deferred<ReturnType<typeof apiSession>>();
      fake.api.signInWithPassword.mockReturnValue(pending.promise);
      await renderScreen(fake);

      await fillAndSubmit('ana@example.com', 'correct horse');

      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeBusy();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
    });

    it('offers to create an account', async () => {
      await renderScreen(createFakeSession());

      expect(await screen.findByRole('link')).toHaveTextContent('¿No tienes cuenta? Crear cuenta');
    });
  });

  it('explains that Google sign-in is not part of the running binary', async () => {
    const fake = createFakeSession();
    fake.google.requestGoogleIdToken.mockResolvedValue({ type: 'error', reason: 'unavailable' });
    await renderScreen(fake);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Expo Go.*development build actualizada/);
    expect(fake.api.signInWithGoogle).not.toHaveBeenCalled();
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
