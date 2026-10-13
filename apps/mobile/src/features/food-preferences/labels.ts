import type { Diet } from './food-preferences-api';

export const dietLabels: Record<Diet, string> = {
  VEGETARIAN: 'Vegetariana',
  VEGAN: 'Vegana',
  PESCATARIAN: 'Pescetariana',
  FLEXITARIAN: 'Flexitariana',
};

export const dietDescriptions: Record<Diet, string> = {
  VEGETARIAN: 'Sin carne ni pescado.',
  VEGAN: 'Sin ningún alimento de origen animal.',
  PESCATARIAN: 'Sin carne, con pescado y marisco.',
  FLEXITARIAN: 'Sobre todo vegetal, con carne o pescado de vez en cuando.',
};

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

export const listLabels = {
  liked: 'Me gustan',
  avoided: 'Prefiero evitar',
} as const;

export type PreferenceList = keyof typeof listLabels;
