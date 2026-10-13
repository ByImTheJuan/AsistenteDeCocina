import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { ingredientSchema } from '@/features/ingredients/ingredients-api';

// The 14 allergens the EU requires to declare, then common intolerances. In
// the order they are shown.
export const allergens = [
  'GLUTEN',
  'CRUSTACEANS',
  'EGG',
  'FISH',
  'PEANUTS',
  'SOY',
  'MILK',
  'TREE_NUTS',
  'CELERY',
  'MUSTARD',
  'SESAME',
  'SULPHITES',
  'LUPIN',
  'MOLLUSCS',
  'LACTOSE',
  'FRUCTOSE',
  'HISTAMINE',
  'SORBITOL',
] as const;
export type Allergen = (typeof allergens)[number];

// An allergen this version does not know fails the whole response on purpose:
// saving from a screen that cannot show a restriction would delete it.
const dietaryRestrictionsSchema = z.object({
  allergens: z.array(z.enum(allergens)),
  ingredients: z.array(ingredientSchema),
  conflictingLikedIngredients: z.array(ingredientSchema),
});

export type DietaryRestrictions = z.infer<typeof dietaryRestrictionsSchema>;
/** What the user edits; the conflicts are worked out by the API. */
export type DietaryRestrictionsDraft = Pick<DietaryRestrictions, 'allergens' | 'ingredients'>;

/** Empty lists for a user who has not registered any restriction. */
export async function getDietaryRestrictions(
  request: AuthorizedRequest,
): Promise<DietaryRestrictions> {
  return dietaryRestrictionsSchema.parse(await request('/dietary-restrictions'));
}

/** Replaces the saved restrictions with the given ones. */
export async function saveDietaryRestrictions(
  request: AuthorizedRequest,
  restrictions: DietaryRestrictionsDraft,
): Promise<DietaryRestrictions> {
  return dietaryRestrictionsSchema.parse(
    await request('/dietary-restrictions', {
      method: 'PUT',
      body: {
        allergens: restrictions.allergens,
        ingredientIds: restrictions.ingredients.map((ingredient) => ingredient.id),
      },
    }),
  );
}
