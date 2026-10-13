import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';

export const diets = ['VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'FLEXITARIAN'] as const;
export type Diet = (typeof diets)[number];

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Left open: the catalogue may gain categories this version does not know.
  category: z.string(),
});

const foodPreferencesSchema = z.object({
  diet: z.enum(diets).nullable(),
  liked: z.array(ingredientSchema),
  avoided: z.array(ingredientSchema),
});

export type Ingredient = z.infer<typeof ingredientSchema>;
export type FoodPreferences = z.infer<typeof foodPreferencesSchema>;

/** Empty lists and no diet for a user who has not configured anything. */
export async function getFoodPreferences(request: AuthorizedRequest): Promise<FoodPreferences> {
  return foodPreferencesSchema.parse(await request('/food-preferences'));
}

/** Replaces the saved preferences with the given ones. */
export async function saveFoodPreferences(
  request: AuthorizedRequest,
  preferences: FoodPreferences,
): Promise<FoodPreferences> {
  return foodPreferencesSchema.parse(
    await request('/food-preferences', {
      method: 'PUT',
      body: {
        diet: preferences.diet,
        likedIngredientIds: preferences.liked.map((ingredient) => ingredient.id),
        avoidedIngredientIds: preferences.avoided.map((ingredient) => ingredient.id),
      },
    }),
  );
}

/** Ingredients whose name contains `search`; the start of the catalogue without it. */
export async function searchIngredients(
  request: AuthorizedRequest,
  search: string,
): Promise<Ingredient[]> {
  const text = search.trim();
  const path = text ? `/ingredients?search=${encodeURIComponent(text)}` : '/ingredients';
  return z.array(ingredientSchema).parse(await request(path));
}
