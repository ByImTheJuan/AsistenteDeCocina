import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { TurboModuleRegistry, type TurboModule } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { AccountSummary } from './account-summary';
import { SignInScreen } from './sign-in-screen';

import RootLayout from '@/app/_layout';

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

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();

// Answers each API path with the given status and body; anything else is a 401.
function mockApi(routes: Record<string, [status: number, body?: unknown]>) {
  fetchMock.mockImplementation(async (url) => {
    const [status, body] = routes[new URL(url).pathname] ?? [401];
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
      '(app)/index': AccountSummary,
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
    expect(screen.queryByText('Sesión iniciada como')).not.toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the private area directly when a saved session is still valid', async () => {
    await SecureStore.setItemAsync('auth.refreshToken', 'refresh-0');
    mockApi({ '/auth/refresh': [200, session] });

    await renderApp();

    expect(await screen.findByText('Sesión iniciada como')).toBeOnTheScreen();
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

    expect(await screen.findByText('Sesión iniciada como')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeOnTheScreen();
    expect(requestsTo('/auth/google')[0][1].body).toBe('{"idToken":"google-id-token"}');
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBe('refresh-1');

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByRole('button', { name: 'Continuar con Google' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Sesión iniciada como')).not.toBeOnTheScreen();
    expect(requestsTo('/auth/logout')[0][1].body).toBe('{"refreshToken":"refresh-1"}');
    await expect(SecureStore.getItemAsync('auth.refreshToken')).resolves.toBeNull();
    expect(GoogleSignin.signOut).toHaveBeenCalled();
  });

  it('stays on the sign-in screen when the user cancels the Google picker', async () => {
    mockApi({});
    jest.mocked(GoogleSignin.signIn).mockResolvedValue({ type: 'cancelled', data: null });
    await renderApp();

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Has cancelado/);
    expect(screen.queryByText('Sesión iniciada como')).not.toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
