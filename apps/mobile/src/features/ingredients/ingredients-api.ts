import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { unitSchema } from '@/features/units/units';

export const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Left open: the catalogue may gain categories this version does not know.
  category: z.string(),
  // The unit to offer first when recording a quantity. A unit this version
  // does not know falls back to pieces rather than rejecting the ingredient.
  defaultUnit: unitSchema.catch('PIECE'),
});

export type Ingredient = z.infer<typeof ingredientSchema>;

/**
 * Ingredients whose name or a synonym contains `search` ("papa" finds
 * "Patata"); the start of the catalogue without it.
 */
export async function searchIngredients(
  request: AuthorizedRequest,
  search: string,
): Promise<Ingredient[]> {
  const text = search.trim();
  const path = text ? `/ingredients?search=${encodeURIComponent(text)}` : '/ingredients';
  return z.array(ingredientSchema).parse(await request(path));
}

const categoryLabels: Record<string, string> = {
  VEGETABLE: 'Verduras y hortalizas',
  FRUIT: 'Frutas',
  MEAT: 'Carnes',
  FISH_SEAFOOD: 'Pescados y mariscos',
  DAIRY_EGG: 'Lácteos y huevos',
  GRAIN: 'Cereales y derivados',
  LEGUME: 'Legumbres',
  NUT_SEED: 'Frutos secos y semillas',
  HERB_SPICE: 'Hierbas y especias',
  OTHER: 'Otros',
};

/** Name of an ingredient category; the catalogue may have ones not listed here. */
export function categoryLabel(category: string): string {
  return categoryLabels[category] ?? categoryLabels.OTHER;
}
