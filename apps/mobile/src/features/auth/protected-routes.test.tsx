import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { screen, userEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { act } from 'react';
import { Alert, TurboModuleRegistry, type AlertButton, type TurboModule } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { SignInScreen } from './sign-in-screen';
import { SignUpScreen } from './sign-up-screen';

import RootLayout from '@/app/_layout';
import { AccountScreen } from '@/features/account/account-screen';
import { DeleteAccountScreen } from '@/features/account/delete-account-screen';
import { PasswordScreen } from '@/features/account/password-screen';

// Runs the real root layout, session manager and API client. Only the native
// modules and the network are replaced.
jest.mock('@/components/animated-icon', () => ({ AnimatedSplashOverlay: () => null }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn() }));

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => items.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      items.delete(key);
    }),
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
  statusCodes: {},
  isErrorWithCode: () => false,
  isSuccessResponse: (response: { type: string }) => response.type === 'success',
}));

// Captured once: spying again on an existing spy would return the spy itself.
const getModule = TurboModuleRegistry.get;

const session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: { id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null },
};

const account = {
  ...session.user,
  createdAt: '2026-10-13T08:30:00.000Z',
  signInMethods: { password: true, google: false },
};

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();

// Answers each API path with the given status and body; anything else is a
// 401. The account can always be read, as the private area shows it.
function mockApi(routes: Record<string, [status: number, body?: unknown]>) {
  const known: typeof routes = { '/account': [200, account], ...routes };
  fetchMock.mockImplementation(async (url) => {
    const [status, body] = known[new URL(url).pathname] ?? [401];
    return { ok: status < 300, status, json: async () => body } as Response;
  });
}

function requestsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === path);
}

async function renderApp() {
  await renderRouter(
    {
      _layout: RootLayout,
      'sign-in': SignInScreen,
      'sign-up': SignUpScreen,
      // Same shape as src/app: a private group behind the guard. The account
      // screen stands in for its home screen.
      '(app)/_layout': () => <Slot />,
      '(app)/index': AccountScreen,
      '(app)/account/password': PasswordScreen,
      '(app)/account/delete': DeleteAccountScreen,
    },
    { initialUrl: '/' },
  );
}

describe('protected routes', () => {
  const user = userEvent.setup();

  beforeEach(async () => {
    // The binary includes the native Google module.
    jest
      .spyOn(TurboModuleRegistry, 'get')
      .mockImplementation((name) =>
        name === 'RNGoogleSignin' ? ({} as TurboModule) : getModule(name),
      );
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await SecureStore.deleteItemAsync('auth.refreshToken');
    jest.mocked(GoogleSignin.signIn).mockReset();
  });

  it('sends a visitor without session to the sign-in screen', async () => {
    mockApi({});

    await renderApp();

    expect(
      await screen.findByRole('button', { name: 'Continuar con Google' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Métodos de acceso')).not.toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the private area directly when a saved session is still valid', async () => {
    await SecureStore.setItemAsync('auth.refreshToken', 'refresh-0');
    mockApi({ '/auth/refresh': [200, session] });

    await renderApp();

    expect(await screen.findByText('Métodos de acceso')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeOnTheScreen();
    expect(requestsTo('/auth/refresh')[0][1].body).toBe('{"refreshToken":"refresh-0"}');
  });

  it('asks to sign in again when the saved session was revoked', async () => {
    await SecureStore.setItemAsync('auth.refreshToken', 'refresh-0');
    mockApi({ '/auth/refresh': [401] });

    await renderApp();

    expect(
      await screen.findByRole('button', { name: 'Continuar con Google' }),
    ).toBeOnTheScreen();
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBeNull();
  });

  it('signs in with Google, enters the private area and signs out again', async () => {
    mockApi({ '/auth/google': [200, session], '/auth/logout': [204] });
    jest.mocked(GoogleSignin.signIn).mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);
    await renderApp();

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText('Métodos de acceso')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeOnTheScreen();
    expect(requestsTo('/auth/google')[0][1].body).toBe('{"idToken":"google-id-token"}');
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBe('refresh-1');

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByRole('button', { name: 'Continuar con Google' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Métodos de acceso')).not.toBeOnTheScreen();
    expect(requestsTo('/auth/logout')[0][1].body).toBe('{"refreshToken":"refresh-1"}');
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBeNull();
    expect(GoogleSignin.signOut).toHaveBeenCalled();
  });

  it('registers with email and password, signs out and signs in again', async () => {
    mockApi({
      '/auth/register': [201, session],
      '/auth/logout': [204],
      '/auth/login': [200, { ...session, refreshToken: 'refresh-2' }],
    });
    await renderApp();

    await user.press(await screen.findByRole('link'));
    await user.type(await screen.findByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'Ana@Example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse');
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Métodos de acceso')).toBeOnTheScreen();
    expect(JSON.parse(String(requestsTo('/auth/register')[0][1].body))).toEqual({
      name: 'Ana',
      email: 'Ana@Example.com',
      password: 'correct horse',
    });
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBe('refresh-1');

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse');
    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Métodos de acceso')).toBeOnTheScreen();
    expect(JSON.parse(String(requestsTo('/auth/login')[0][1].body))).toEqual({
      email: 'ana@example.com',
      password: 'correct horse',
    });
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBe('refresh-2');
    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  });

  it('changes the password and then deletes the account from the account screen', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await SecureStore.setItemAsync('auth.refreshToken', 'refresh-0');
    mockApi({
      '/auth/refresh': [200, session],
      '/account/password': [200, account],
      '/account/delete': [204],
    });
    await renderApp();

    await user.press(await screen.findByRole('button', { name: 'Cambiar contraseña' }));
    await user.type(await screen.findByLabelText('Contraseña actual'), 'old password');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'a new password');
    await user.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Métodos de acceso')).toBeOnTheScreen();
    const passwordRequest = requestsTo('/account/password')[0][1];
    expect(passwordRequest.method).toBe('PUT');
    expect(passwordRequest.headers).toMatchObject({ Authorization: 'Bearer access-1' });
    expect(JSON.parse(String(passwordRequest.body))).toEqual({
      currentPassword: 'old password',
      newPassword: 'a new password',
    });

    await user.press(screen.getByRole('link', { name: 'Eliminar mi cuenta' }));
    await user.type(await screen.findByLabelText('Contraseña actual'), 'a new password');
    await user.press(screen.getByRole('button', { name: 'Eliminar mi cuenta definitivamente' }));
    const buttons: AlertButton[] = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      await buttons.find((button) => button.text === 'Eliminar')?.onPress?.();
    });

    expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeOnTheScreen();
    expect(screen.queryByText('Métodos de acceso')).not.toBeOnTheScreen();
    expect(JSON.parse(String(requestsTo('/account/delete')[0][1].body))).toEqual({
      currentPassword: 'a new password',
    });
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBeNull();
    alert.mockRestore();
  });

  it('moves between the sign-in and sign-up screens', async () => {
    mockApi({});
    await renderApp();

    await user.press(await screen.findByRole('link'));
    expect(await screen.findByRole('button', { name: 'Crear cuenta' })).toBeOnTheScreen();

    await user.press(screen.getByRole('link'));
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
  });

  it('stays on the sign-in screen when the user cancels the Google picker', async () => {
    mockApi({});
    jest.mocked(GoogleSignin.signIn).mockResolvedValue({ type: 'cancelled', data: null });
    await renderApp();

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Has cancelado/);
    expect(screen.queryByText('Métodos de acceso')).not.toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
