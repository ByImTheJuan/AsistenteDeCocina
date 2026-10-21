import { apiErrorMessage } from '@/lib/api-error-message';

const messagesByCode: Record<string, string> = {
  unknown_recipe: 'Esa receta ya no está en el catálogo. Elige otra.',
  meal_slot_taken:
    'Ya tienes una receta en esa comida. Elige otro día u otra comida, o cambia la receta que hay.',
  recipe_not_allowed: 'Esa receta no es apta según tus alergias e intolerancias. Elige otra.',
  meal_plan_entry_not_found: 'Esta receta ya no está en tu plan.',
};

/** Message to show when a meal plan request fails. */
export function mealPlanErrorMessage(error: unknown): string {
  return apiErrorMessage(error, messagesByCode);
}
