import { ApiError, NetworkError } from '@/lib/api-client';

/**
 * Message to show when a request fails. `messagesByCode` explains the errors
 * the API identifies with a `code`; anything else gets a generic message.
 */
export function apiErrorMessage(
  error: unknown,
  messagesByCode: Record<string, string> = {},
): string {
  if (error instanceof NetworkError) {
    return 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof ApiError && error.code && messagesByCode[error.code]) {
    return messagesByCode[error.code];
  }
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}
