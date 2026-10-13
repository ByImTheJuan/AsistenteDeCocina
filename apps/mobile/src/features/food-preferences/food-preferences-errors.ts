import { apiErrorMessage } from '@/lib/api-error-message';

const messagesByCode: Record<string, string> = {
  ingredient_in_both_lists:
    'Un alimento no puede estar a la vez en «Me gustan» y en «Prefiero evitar».',
  unknown_ingredient: 'Alguno de los alimentos ya no está disponible. Quítalo y vuelve a guardar.',
};

/** Message to show when a food preferences request fails. */
export function foodPreferencesErrorMessage(error: unknown): string {
  return apiErrorMessage(error, messagesByCode);
}
