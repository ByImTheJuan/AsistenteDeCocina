import { apiErrorMessage } from '@/lib/api-error-message';

const messagesByCode: Record<string, string> = {
  unknown_ingredient: 'Alguno de los alimentos ya no está disponible. Quítalo y vuelve a guardar.',
};

/** Message to show when a dietary restrictions request fails. */
export function dietaryRestrictionsErrorMessage(error: unknown): string {
  return apiErrorMessage(error, messagesByCode);
}
