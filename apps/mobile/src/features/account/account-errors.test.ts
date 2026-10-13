import { accountErrorMessage, isWrongCurrentPassword } from './account-errors';

import { ApiError, NetworkError } from '@/lib/api-client';

describe('accountErrorMessage', () => {
  it.each([
    ['invalid_current_password', 403, 'La contraseña actual no es correcta.'],
    ['last_sign_in_method', 409, 'No puedes quitar el único método de acceso'],
    ['google_email_mismatch', 409, 'tiene un email distinto'],
    ['google_account_in_use', 409, 'ya está vinculada a otra cuenta'],
    ['google_already_linked', 409, 'ya está vinculada a otra cuenta de Google'],
  ])('explains the "%s" error', (code, status, message) => {
    expect(accountErrorMessage(new ApiError(status, code))).toContain(message);
  });

  it('explains a connection failure', () => {
    expect(accountErrorMessage(new NetworkError())).toContain('No hemos podido conectar');
  });

  it('explains the rate limit', () => {
    expect(accountErrorMessage(new ApiError(429))).toContain('demasiados intentos');
  });

  it.each([new ApiError(500), new ApiError(409, 'something_new'), new Error('boom'), 'boom'])(
    'falls back to a generic message for %p',
    (error) => {
      expect(accountErrorMessage(error)).toBe(
        'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
      );
    },
  );
});

describe('isWrongCurrentPassword', () => {
  it('recognises the rejected current password', () => {
    expect(isWrongCurrentPassword(new ApiError(403, 'invalid_current_password'))).toBe(true);
  });

  it.each([new ApiError(403), new ApiError(409, 'last_sign_in_method'), new NetworkError()])(
    'is false for %p',
    (error) => {
      expect(isWrongCurrentPassword(error)).toBe(false);
    },
  );
});
