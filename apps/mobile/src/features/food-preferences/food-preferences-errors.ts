import { ApiError, NetworkError } from '@/lib/api-client';

const messagesByCode: Record<string, string> = {
  ingredient_in_both_lists:
    'Un alimento no puede estar a la vez en «Me gustan» y en «Prefiero evitar».',
  unknown_ingredient: 'Alguno de los alimentos ya no está disponible. Quítalo y vuelve a guardar.',
};

/** Message to show when a food preferences request fails. */
export function foodPreferencesErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof ApiError && error.code && messagesByCode[error.code]) {
    return messagesByCode[error.code];
  }
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}
