import type { Prisma } from '../generated/prisma/client.js';

// Ingredients always leave the API with their allergens, so every query that
// returns them loads the relation with this.
export const withAllergens = {
  allergens: true,
} satisfies Prisma.IngredientInclude;

export type IngredientWithAllergens = Prisma.IngredientGetPayload<{
  include: typeof withAllergens;
}>;
