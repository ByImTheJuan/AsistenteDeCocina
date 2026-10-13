import { ApiError, NetworkError } from '@/lib/api-client';

const messagesByCode: Record<string, string> = {
  invalid_current_password: 'La contraseña actual no es correcta.',
  last_sign_in_method:
    'No puedes quitar el único método de acceso de tu cuenta. Añade otro antes.',
  google_email_mismatch:
    'Esa cuenta de Google tiene un email distinto al de tu cuenta. Solo puedes vincular la que usa el mismo email.',
  google_account_in_use: 'Esa cuenta de Google ya está vinculada a otra cuenta.',
  google_already_linked: 'Tu cuenta ya está vinculada a otra cuenta de Google.',
};

/** True when the API rejected the current password the user typed. */
export function isWrongCurrentPassword(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'invalid_current_password';
}

/** Message to show when an account request fails. */
export function accountErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof ApiError) {
    if (error.code && messagesByCode[error.code]) {
      return messagesByCode[error.code];
    }
    if (error.status === 429) {
      return 'Has hecho demasiados intentos. Espera un minuto y vuelve a intentarlo.';
    }
  }
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}
