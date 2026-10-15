import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { unitSchema, type Unit } from '@/features/units/units';

const isKnownUnit = (unit: string): unit is Unit => unitSchema.safeParse(unit).success;

export const ingredientSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    // Left open: the catalogue may gain categories this version does not know.
    category: z.string(),
    // The units the food is recorded in at home, and the one offered first.
    // Units this version does not know are left out rather than rejecting the
    // ingredient.
    units: z.array(z.string()).transform((units) => units.filter(isKnownUnit)),
    defaultUnit: z.string(),
  })
  .transform(({ units, defaultUnit, ...ingredient }) => {
    const known = units.length > 0 ? units : (['PIECE'] satisfies Unit[]);
    return {
      ...ingredient,
      units: known,
      defaultUnit: known.find((unit) => unit === defaultUnit) ?? known[0],
    };
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
