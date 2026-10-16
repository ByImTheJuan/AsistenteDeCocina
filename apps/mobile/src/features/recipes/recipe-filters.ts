import { formatCalories } from './recipe-format';

// The search and filters of the "Recetas" tab. The API applies them (it
// searches in synonyms and knows the origin of each food); the app only keeps
// what the user chose and says it back. The restrictions are always applied
// first, whatever the filters.

export type FilterDiet = 'VEGETARIAN' | 'VEGAN' | 'PESCATARIAN';
export type RecipeSort = 'NAME' | 'TIME' | 'CALORIES';

export type RecipeFilters = {
  maxMinutes: number | null;
  /** Per serving. Recipes whose calories are unknown are left out. */
  maxCalories: number | null;
  diet: FilterDiet | null;
  sort: RecipeSort;
};

export const noFilters: RecipeFilters = {
  maxMinutes: null,
  maxCalories: null,
  diet: null,
  sort: 'NAME',
};

export const minutesOptions = [15, 30, 60] as const;
export const caloriesOptions = [300, 500, 700] as const;

export const dietLabels: Record<FilterDiet, string> = {
  VEGETARIAN: 'Vegetariana',
  VEGAN: 'Vegana',
  PESCATARIAN: 'Pescetariana',
};

export const sortLabels: Record<RecipeSort, string> = {
  NAME: 'Nombre',
  TIME: 'Menos tiempo',
  CALORIES: 'Menos calorías',
};

/** How many filters differ from none; the order counts when it is not by name. */
export function activeFilterCount(filters: RecipeFilters): number {
  return [
    filters.maxMinutes !== null,
    filters.maxCalories !== null,
    filters.diet !== null,
    filters.sort !== 'NAME',
  ].filter(Boolean).length;
}

/** 'Hasta 30 min · Hasta 500 kcal · Vegetariana · Menos calorías'. */
export function describeFilters(filters: RecipeFilters): string {
  return [
    filters.maxMinutes === null ? null : `Hasta ${filters.maxMinutes} min`,
    filters.maxCalories === null ? null : `Hasta ${formatCalories(filters.maxCalories)}`,
    filters.diet === null ? null : dietLabels[filters.diet],
    filters.sort === 'NAME' ? null : sortLabels[filters.sort],
  ]
    .filter((part) => part !== null)
    .join(' · ');
}

/**
 * The query string for the API, with only what is set: '' with no search and
 * no filters, so the plain list is asked as before.
 */
export function toQuery(search: string, filters: RecipeFilters): string {
  // Built by hand: React Native's URLSearchParams does not implement it all.
  const params: [string, string | number | null][] = [
    ['search', search.trim() || null],
    ['maxMinutes', filters.maxMinutes],
    ['maxCalories', filters.maxCalories],
    ['diet', filters.diet],
    ['sort', filters.sort === 'NAME' ? null : filters.sort],
  ];
  return params
    .filter((param): param is [string, string | number] => param[1] !== null)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&');
}
