import { apiErrorMessage } from '@/lib/api-error-message';

const messagesByCode: Record<string, string> = {
  recipe_not_found: 'Esta receta ya no está en el catálogo.',
};

/** Message to show when a recipe request fails. */
export function recipesErrorMessage(error: unknown): string {
  return apiErrorMessage(error, messagesByCode);
}
