import type { Allergen } from '../generated/prisma/client.js';
import type { IngredientWithAllergens } from '../ingredients/ingredient-with-allergens.js';
import { sortAllergens } from '../ingredients/ingredients.dto.js';

/** The safety restrictions of a user: what they must not eat. */
export type Restrictions = {
  allergens: Allergen[];
  ingredients: { id: string }[];
};

export type RecipeSafety = {
  /** Restricted allergens some ingredient of the recipe contains. */
  conflictingAllergens: Allergen[];
  /** Ingredients of the recipe the user has restricted by name. */
  conflictingIngredients: IngredientWithAllergens[];
  /**
   * True when some ingredient is a processed food whose composition depends on
   * the brand: it may contain allergens that are not listed, so the recipe
   * cannot be presented as safe without the user checking it.
   */
  allergensUncertain: boolean;
};

/**
 * How a recipe stands against the user's restrictions. Restrictions are
 * mandatory: a recipe with any conflict is not apt for the user.
 */
export function recipeSafety(
  ingredients: IngredientWithAllergens[],
  restrictions: Restrictions,
): RecipeSafety {
  const restrictedIds = new Set(restrictions.ingredients.map(({ id }) => id));
  const present = new Set(
    ingredients.flatMap(({ allergens }) =>
      allergens.map(({ allergen }) => allergen),
    ),
  );
  const conflictingIngredients = ingredients.filter(
    ({ id }, index) =>
      restrictedIds.has(id) &&
      // A food listed twice is one conflict.
      ingredients.findIndex((other) => other.id === id) === index,
  );
  return {
    conflictingAllergens: sortAllergens(
      restrictions.allergens.filter((allergen) => present.has(allergen)),
    ),
    conflictingIngredients,
    allergensUncertain: ingredients.some(
      ({ allergensUncertain }) => allergensUncertain,
    ),
  };
}

export function hasConflicts(safety: RecipeSafety): boolean {
  return (
    safety.conflictingAllergens.length > 0 ||
    safety.conflictingIngredients.length > 0
  );
}
