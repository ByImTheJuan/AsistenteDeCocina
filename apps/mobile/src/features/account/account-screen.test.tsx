import { screen, userEvent } from '@testing-library/react-native';

import { AccountScreen } from './account-screen';
import {
  googleAccount,
  linkedAccount,
  passwordAccount,
  renderSignedIn,
} from './account-test-utils';

import { requestGoogleIdToken } from '@/features/auth/google-sign-in';
import type { GoogleSignInResult } from '@/features/auth/google-sign-in';
import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));
// The screen asks Google for the ID token through this module.
jest.mock('@/features/auth/google-sign-in', () => ({
  requestGoogleIdToken: jest.fn(),
  signOutFromGoogle: jest.fn(),
}));

describe('AccountScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows the basic data of the account', async () => {
    await renderSignedIn(<AccountScreen />, { 'GET /account': () => passwordAccount });

    expect(await screen.findByLabelText('Nombre: Ana')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email: ana@example.com')).toBeOnTheScreen();
    expect(screen.getByLabelText('Miembro desde: 13 de octubre de 2026')).toBeOnTheScreen();
  });

  it('shows a placeholder when the account has no name', async () => {
    await renderSignedIn(<AccountScreen />, {
      'GET /account': () => ({ ...passwordAccount, name: null }),
    });

    expect(await screen.findByLabelText('Nombre: Sin nombre')).toBeOnTheScreen();
  });

  it('shows progress while the account loads', async () => {
    await renderSignedIn(<AccountScreen />, { 'GET /account': () => new Promise(() => {}) });

    expect(await screen.findByLabelText('Cargando tu cuenta')).toBeOnTheScreen();
  });

  describe('sign-in methods', () => {
    it('offers to change the password and link Google with only a password', async () => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => passwordAccount });

      expect(await screen.findByLabelText('Contraseña: Configurada')).toBeOnTheScreen();
      expect(screen.getByLabelText('Google: No vinculada')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Vincular Google' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Quitar contraseña' })).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Desvincular Google' })).not.toBeOnTheScreen();
    });

    it('offers to add a password with only Google', async () => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => googleAccount });

      expect(await screen.findByLabelText('Contraseña: No configurada')).toBeOnTheScreen();
      expect(screen.getByLabelText('Google: Vinculada')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Añadir contraseña' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Vincular Google' })).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Desvincular Google' })).not.toBeOnTheScreen();
    });

    it('offers to remove either method when the account has both', async () => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => linkedAccount });

      expect(await screen.findByRole('button', { name: 'Quitar contraseña' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Desvincular Google' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeOnTheScreen();
    });

    it.each([
      ['Cambiar contraseña', '/account/password'],
      ['Quitar contraseña', '/account/remove-method?method=password'],
      ['Desvincular Google', '/account/remove-method?method=google'],
    ])('opens the right form when "%s" is pressed', async (name, href) => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => linkedAccount });

      await user.press(await screen.findByRole('button', { name }));

      expect(mockPush).toHaveBeenCalledWith(href);
    });

    it('opens the password form to add a first password', async () => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => googleAccount });

      await user.press(await screen.findByRole('button', { name: 'Añadir contraseña' }));

      expect(mockPush).toHaveBeenCalledWith('/account/password');
    });

    it('explains why the only method cannot be removed', async () => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => passwordAccount });

      expect(
        await screen.findByText(/Tu cuenta necesita al menos un método de acceso/),
      ).toBeOnTheScreen();
    });

    it('does not show that explanation when there are two methods', async () => {
      await renderSignedIn(<AccountScreen />, { 'GET /account': () => linkedAccount });
      await screen.findByLabelText('Google: Vinculada');

      expect(
        screen.queryByText(/Tu cuenta necesita al menos un método de acceso/),
      ).not.toBeOnTheScreen();
    });
  });

  describe('linking Google', () => {
    async function renderAndLink(
      google: GoogleSignInResult,
      link: () => unknown = () => linkedAccount,
    ) {
      const test = await renderSignedIn(<AccountScreen />, {
        'GET /account': () => passwordAccount,
        'PUT /account/google': link,
      });
      jest.mocked(requestGoogleIdToken).mockResolvedValue(google);
      await user.press(await screen.findByRole('button', { name: 'Vincular Google' }));
      return test;
    }

    it('links the Google account and shows it as linked', async () => {
      const test = await renderAndLink({ type: 'success', idToken: 'google-id-token' });

      expect(await screen.findByLabelText('Google: Vinculada')).toBeOnTheScreen();
      expect(test.sentTo('PUT /account/google')).toEqual([{ idToken: 'google-id-token' }]);
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });

    it('changes nothing when the user cancels the Google picker', async () => {
      const test = await renderAndLink({ type: 'cancelled' });

      expect(test.sentTo('PUT /account/google')).toEqual([]);
      expect(screen.getByLabelText('Google: No vinculada')).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });

    it('explains that Google is not part of the running binary', async () => {
      await renderAndLink({ type: 'error', reason: 'unavailable' });

      expect(await screen.findByRole('alert')).toHaveTextContent(/Expo Go.*development build/);
    });

    it.each([
      ['a different email', new ApiError(409, 'google_email_mismatch'), /email distinto/],
      [
        'a Google account in use',
        new ApiError(409, 'google_account_in_use'),
        /ya está vinculada a otra cuenta/,
      ],
      ['no connection', new NetworkError(), /No hemos podido conectar/],
    ])('explains a rejection because of %s', async (_case, error, message) => {
      await renderAndLink({ type: 'success', idToken: 'google-id-token' }, () => {
        throw error;
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByLabelText('Google: No vinculada')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Vincular Google' })).toBeEnabled();
    });
  });

  it('signs the user out', async () => {
    const test = await renderSignedIn(<AccountScreen />, { 'GET /account': () => passwordAccount });

    await user.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(test.manager.getState()).toEqual({ status: 'signedOut' });
    expect(test.api.signOut).toHaveBeenCalledWith('refresh-1');
  });

  it('links to the account deletion screen', async () => {
    await renderSignedIn(<AccountScreen />, { 'GET /account': () => passwordAccount });

    expect(await screen.findByRole('link', { name: 'Eliminar mi cuenta' })).toBeOnTheScreen();
  });

  describe('when the account cannot be loaded', () => {
    it('explains a connection failure and retries', async () => {
      let attempts = 0;
      await renderSignedIn(<AccountScreen />, {
        'GET /account': () => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return passwordAccount;
        },
      });

      expect(await screen.findByText('No se ha podido cargar tu cuenta')).toBeOnTheScreen();
      expect(screen.getByText(/No hemos podido conectar con el servidor/)).toBeOnTheScreen();

      await user.press(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByLabelText('Nombre: Ana')).toBeOnTheScreen();
    });

    it('still lets the user sign out', async () => {
      const test = await renderSignedIn(<AccountScreen />, {
        'GET /account': () => {
          throw new ApiError(500);
        },
      });

      await user.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));

      expect(test.manager.getState()).toEqual({ status: 'signedOut' });
    });
  });
});
