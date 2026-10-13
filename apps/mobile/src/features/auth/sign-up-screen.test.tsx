import { render, screen, userEvent } from '@testing-library/react-native';

import { SessionProvider } from './session-provider';
import { apiSession, createFakeSession } from './session-test-utils';
import { SignUpScreen } from './sign-up-screen';

import { ApiError, NetworkError } from '@/lib/api-client';

// The shared instance created by the module is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

type FakeSession = ReturnType<typeof createFakeSession>;

async function renderScreen(fake: FakeSession) {
  await render(
    <SessionProvider manager={fake.manager}>
      <SignUpScreen />
    </SessionProvider>,
  );
  await screen.findByRole('button', { name: 'Crear cuenta' });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('SignUpScreen', () => {
  const user = userEvent.setup();

  async function fill(name: string, email: string, password: string) {
    if (name) await user.type(screen.getByLabelText('Nombre'), name);
    if (email) await user.type(screen.getByLabelText('Email'), email);
    if (password) await user.type(screen.getByLabelText('Contraseña'), password);
  }

  const submit = () => user.press(screen.getByRole('button', { name: 'Crear cuenta' }));

  it('creates the account and starts the session', async () => {
    const fake = createFakeSession();
    fake.api.register.mockResolvedValue(apiSession());
    await renderScreen(fake);

    await fill('Ana', 'ana@example.com', 'correct horse');
    await submit();

    expect(fake.api.register).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'correct horse',
    });
    expect(fake.manager.getState().status).toBe('signedIn');
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('hides the password while it is typed', async () => {
    await renderScreen(createFakeSession());

    expect(screen.getByLabelText('Contraseña')).toHaveProp('secureTextEntry', true);
  });

  it('asks for every field before calling the server', async () => {
    const fake = createFakeSession();
    await renderScreen(fake);

    await submit();

    expect(await screen.findByText('Escribe tu nombre.')).toBeOnTheScreen();
    expect(screen.getByText('Escribe tu email.')).toBeOnTheScreen();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeOnTheScreen();
    expect(fake.api.register).not.toHaveBeenCalled();
  });

  it('rejects a malformed email and a short password', async () => {
    const fake = createFakeSession();
    await renderScreen(fake);

    await fill('Ana', 'ana-at-example.com', '1234567');
    await submit();

    expect(await screen.findByText('Escribe un email válido.')).toBeOnTheScreen();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeOnTheScreen();
    expect(fake.api.register).not.toHaveBeenCalled();
  });

  it('lets the user correct the data and try again', async () => {
    const fake = createFakeSession();
    fake.api.register.mockResolvedValue(apiSession());
    await renderScreen(fake);
    await fill('Ana', 'ana@example.com', '1234567');
    await submit();
    await screen.findByText('La contraseña debe tener al menos 8 caracteres.');

    await user.type(screen.getByLabelText('Contraseña'), '8');
    await submit();

    expect(fake.api.register).toHaveBeenCalledWith(
      expect.objectContaining({ password: '12345678' }),
    );
    expect(fake.manager.getState().status).toBe('signedIn');
  });

  it('disables the button while the account is being created', async () => {
    const fake = createFakeSession();
    const pending = deferred<ReturnType<typeof apiSession>>();
    fake.api.register.mockReturnValue(pending.promise);
    await renderScreen(fake);

    await fill('Ana', 'ana@example.com', 'correct horse');
    await submit();

    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeBusy();
  });

  it.each([
    [
      'the email already has an account',
      new ApiError(409),
      'Ya existe una cuenta con ese email. Inicia sesión o usa otro email.',
    ],
    [
      'the server rejects the data',
      new ApiError(400),
      'El servidor no ha aceptado los datos. Revísalos e inténtalo de nuevo.',
    ],
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
    [
      'the server fails',
      new ApiError(500),
      'Ha ocurrido un error inesperado al crear la cuenta. Inténtalo de nuevo.',
    ],
  ])('shows a clear message when %s', async (_case, error, message) => {
    const fake = createFakeSession();
    fake.api.register.mockRejectedValue(error);
    await renderScreen(fake);

    await fill('Ana', 'ana@example.com', 'correct horse');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
    expect(fake.manager.getState().status).not.toBe('signedIn');
  });

  it('links back to the sign-in screen', async () => {
    await renderScreen(createFakeSession());

    expect(screen.getByRole('link')).toHaveTextContent('¿Ya tienes cuenta? Inicia sesión');
  });
});
