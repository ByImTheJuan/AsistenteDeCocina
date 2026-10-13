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

export const listLabels = {
  liked: 'Me gustan',
  avoided: 'Prefiero evitar',
} as const;

export type PreferenceList = keyof typeof listLabels;
