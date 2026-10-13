import { screen, userEvent } from '@testing-library/react-native';

import {
  googleAccount,
  linkedAccount,
  passwordAccount,
  renderSignedIn,
} from './account-test-utils';
import { PasswordScreen } from './password-screen';

import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ back: mockBack }),
}));

describe('PasswordScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockBack.mockClear();
  });

  describe('for an account without password', () => {
    const render = (setPassword: () => unknown = () => linkedAccount) =>
      renderSignedIn(<PasswordScreen />, {
        'GET /account': () => googleAccount,
        'PUT /account/password': setPassword,
      });

    it('adds the password without asking for a current one', async () => {
      const test = await render();

      await user.type(await screen.findByLabelText('Nueva contraseña'), 'a new password');
      await user.press(screen.getByRole('button', { name: 'Añadir contraseña' }));

      expect(screen.queryByLabelText('Contraseña actual')).not.toBeOnTheScreen();
      expect(test.sentTo('PUT /account/password')).toEqual([{ newPassword: 'a new password' }]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('rejects a short password before calling the server', async () => {
      const test = await render();

      await user.type(await screen.findByLabelText('Nueva contraseña'), '1234567');
      await user.press(screen.getByRole('button', { name: 'Añadir contraseña' }));

      expect(
        await screen.findByText('La contraseña debe tener al menos 8 caracteres.'),
      ).toBeOnTheScreen();
      expect(test.sentTo('PUT /account/password')).toEqual([]);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('hides the password while it is typed', async () => {
      await render();

      expect(await screen.findByLabelText('Nueva contraseña')).toHaveProp('secureTextEntry', true);
    });
  });

  describe('for an account with password', () => {
    const render = (setPassword: () => unknown = () => passwordAccount) =>
      renderSignedIn(<PasswordScreen />, {
        'GET /account': () => passwordAccount,
        'PUT /account/password': setPassword,
      });

    async function fillAndSubmit(current: string, next: string) {
      if (current) await user.type(await screen.findByLabelText('Contraseña actual'), current);
      if (next) await user.type(await screen.findByLabelText('Nueva contraseña'), next);
      await user.press(await screen.findByRole('button', { name: 'Cambiar contraseña' }));
    }

    it('changes the password with the current one', async () => {
      const test = await render();

      await fillAndSubmit('old password', 'a new password');

      expect(test.sentTo('PUT /account/password')).toEqual([
        { currentPassword: 'old password', newPassword: 'a new password' },
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('warns that the other sessions will be closed', async () => {
      await render();

      expect(
        await screen.findByText('Al cambiarla se cerrará la sesión en tus otros dispositivos.'),
      ).toBeOnTheScreen();
    });

    it('asks for both passwords before calling the server', async () => {
      const test = await render();

      await fillAndSubmit('', '');

      expect(await screen.findByText('Escribe tu contraseña actual.')).toBeOnTheScreen();
      expect(
        screen.getByText('La contraseña debe tener al menos 8 caracteres.'),
      ).toBeOnTheScreen();
      expect(test.sentTo('PUT /account/password')).toEqual([]);
    });

    it('marks the current password as wrong and lets the user correct it', async () => {
      let attempts = 0;
      const test = await render(() => {
        attempts += 1;
        if (attempts === 1) {
          throw new ApiError(403, 'invalid_current_password');
        }
        return passwordAccount;
      });

      await fillAndSubmit('wrong', 'a new password');

      expect(await screen.findByText('La contraseña actual no es correcta.')).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();

      await user.type(screen.getByLabelText('Contraseña actual'), ' no more');
      await user.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(test.sentTo('PUT /account/password')).toHaveLength(2);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['there is no connection', new NetworkError(), /No hemos podido conectar/],
      ['there are too many attempts', new ApiError(429), /demasiados intentos/],
      ['the server fails', new ApiError(500), /error inesperado/],
    ])('shows a clear message when %s', async (_case, error, message) => {
      await render(() => {
        throw error;
      });

      await fillAndSubmit('old password', 'a new password');

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeEnabled();
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('disables the button while the change is in progress', async () => {
      await render(() => new Promise(() => {}));

      await fillAndSubmit('old password', 'a new password');

      expect(await screen.findByRole('button', { name: 'Cambiar contraseña' })).toBeBusy();
    });
  });

  it('also asks for the current password when the account has both methods', async () => {
    await renderSignedIn(<PasswordScreen />, { 'GET /account': () => linkedAccount });

    expect(await screen.findByLabelText('Contraseña actual')).toBeOnTheScreen();
  });
});
