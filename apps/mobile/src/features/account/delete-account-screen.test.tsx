import { screen, userEvent } from '@testing-library/react-native';
import { act } from 'react';
import { Alert, type AlertButton } from 'react-native';

import { googleAccount, passwordAccount, renderSignedIn } from './account-test-utils';
import { DeleteAccountScreen } from './delete-account-screen';

import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

describe('DeleteAccountScreen', () => {
  const user = userEvent.setup();
  let alert: jest.SpyInstance;

  beforeEach(() => {
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alert.mockRestore();
  });

  /** Presses a button of the confirmation dialog the screen opened. */
  async function answerDialog(text: 'Cancelar' | 'Eliminar') {
    const buttons: AlertButton[] = alert.mock.calls.at(-1)[2];
    await act(async () => {
      await buttons.find((button) => button.text === text)?.onPress?.();
    });
  }

  const pressDelete = async () =>
    user.press(await screen.findByRole('button', { name: 'Eliminar mi cuenta definitivamente' }));

  it('explains the consequences before anything is deleted', async () => {
    const test = await renderSignedIn(<DeleteAccountScreen />, {
      'GET /account': () => passwordAccount,
    });

    expect(await screen.findByText(/Se borrarán tu cuenta y tus datos personales/)).toBeOnTheScreen();
    expect(screen.getByText(/Se cerrará la sesión en todos tus dispositivos/)).toBeOnTheScreen();
    expect(screen.getByText(/seguirán visibles, sin tu nombre/)).toBeOnTheScreen();
    expect(screen.getByText(/No se puede deshacer/)).toBeOnTheScreen();
    expect(test.sentTo('POST /account/delete')).toEqual([]);
  });

  it('deletes the account after the password and a confirmation, and signs out', async () => {
    const test = await renderSignedIn(<DeleteAccountScreen />, {
      'GET /account': () => passwordAccount,
      'POST /account/delete': () => undefined,
    });

    await user.type(await screen.findByLabelText('Contraseña actual'), 'current password');
    await pressDelete();

    expect(alert).toHaveBeenCalledWith(
      '¿Eliminar tu cuenta?',
      expect.stringContaining('no se podrán recuperar'),
      expect.any(Array),
    );
    expect(test.sentTo('POST /account/delete')).toEqual([]);

    await answerDialog('Eliminar');

    expect(test.sentTo('POST /account/delete')).toEqual([{ currentPassword: 'current password' }]);
    expect(test.manager.getState()).toEqual({ status: 'signedOut' });
    expect(test.storedRefreshToken()).toBeNull();
  });

  it('keeps the account when the user cancels the confirmation', async () => {
    const test = await renderSignedIn(<DeleteAccountScreen />, {
      'GET /account': () => passwordAccount,
      'POST /account/delete': () => undefined,
    });

    await user.type(await screen.findByLabelText('Contraseña actual'), 'current password');
    await pressDelete();
    await answerDialog('Cancelar');

    expect(test.sentTo('POST /account/delete')).toEqual([]);
    expect(test.manager.getState().status).toBe('signedIn');
  });

  it('asks for the password before showing the confirmation', async () => {
    await renderSignedIn(<DeleteAccountScreen />, { 'GET /account': () => passwordAccount });

    await pressDelete();

    expect(await screen.findByText('Escribe tu contraseña actual.')).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
  });

  it('needs no password for an account that only signs in with Google', async () => {
    const test = await renderSignedIn(<DeleteAccountScreen />, {
      'GET /account': () => googleAccount,
      'POST /account/delete': () => undefined,
    });

    await pressDelete();
    await answerDialog('Eliminar');

    expect(screen.queryByLabelText('Contraseña actual')).not.toBeOnTheScreen();
    expect(test.sentTo('POST /account/delete')).toEqual([{ currentPassword: undefined }]);
    expect(test.manager.getState()).toEqual({ status: 'signedOut' });
  });

  it.each([
    [
      'the password is wrong',
      new ApiError(403, 'invalid_current_password'),
      'La contraseña actual no es correcta.',
    ],
    ['there is no connection', new NetworkError(), /No hemos podido conectar/],
    ['the server fails', new ApiError(500), /error inesperado/],
  ])('keeps the session and explains it when %s', async (_case, error, message) => {
    const test = await renderSignedIn(<DeleteAccountScreen />, {
      'GET /account': () => passwordAccount,
      'POST /account/delete': () => {
        throw error;
      },
    });

    await user.type(await screen.findByLabelText('Contraseña actual'), 'some password');
    await pressDelete();
    await answerDialog('Eliminar');

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(test.manager.getState().status).toBe('signedIn');
    expect(test.storedRefreshToken()).toBe('refresh-1');
  });
});
