import { screen, userEvent } from '@testing-library/react-native';

import {
  googleAccount,
  linkedAccount,
  passwordAccount,
  renderSignedIn,
} from './account-test-utils';
import { RemoveMethodScreen } from './remove-method-screen';

import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ back: mockBack }),
}));

describe('RemoveMethodScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockBack.mockClear();
  });

  it('removes the password after confirming with it', async () => {
    const test = await renderSignedIn(<RemoveMethodScreen method="password" />, {
      'GET /account': () => linkedAccount,
      'DELETE /account/password': () => googleAccount,
    });

    expect(
      await screen.findByText(/Dejarás de poder entrar con tu email y contraseña/),
    ).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Contraseña actual'), 'current password');
    await user.press(screen.getByRole('button', { name: 'Quitar contraseña' }));

    expect(test.sentTo('DELETE /account/password')).toEqual([
      { currentPassword: 'current password' },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('unlinks Google after confirming with the password', async () => {
    const test = await renderSignedIn(<RemoveMethodScreen method="google" />, {
      'GET /account': () => linkedAccount,
      'DELETE /account/google': () => passwordAccount,
    });

    expect(await screen.findByText(/Dejarás de poder entrar con Google/)).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Contraseña actual'), 'current password');
    await user.press(screen.getByRole('button', { name: 'Desvincular Google' }));

    expect(test.sentTo('DELETE /account/google')).toEqual([
      { currentPassword: 'current password' },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('asks for the password before calling the server', async () => {
    const test = await renderSignedIn(<RemoveMethodScreen method="google" />, {
      'GET /account': () => linkedAccount,
    });

    await user.press(await screen.findByRole('button', { name: 'Desvincular Google' }));

    expect(await screen.findByText('Escribe tu contraseña actual.')).toBeOnTheScreen();
    expect(test.sentTo('DELETE /account/google')).toEqual([]);
  });

  it.each([
    [
      'the password is wrong',
      new ApiError(403, 'invalid_current_password'),
      'La contraseña actual no es correcta.',
    ],
    [
      'it is the last method',
      new ApiError(409, 'last_sign_in_method'),
      /No puedes quitar el único método de acceso/,
    ],
    ['there is no connection', new NetworkError(), /No hemos podido conectar/],
  ])('keeps the method and explains it when %s', async (_case, error, message) => {
    await renderSignedIn(<RemoveMethodScreen method="password" />, {
      'GET /account': () => linkedAccount,
      'DELETE /account/password': () => {
        throw error;
      },
    });

    await user.type(await screen.findByLabelText('Contraseña actual'), 'some password');
    await user.press(screen.getByRole('button', { name: 'Quitar contraseña' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Quitar contraseña' })).toBeEnabled();
  });
});
