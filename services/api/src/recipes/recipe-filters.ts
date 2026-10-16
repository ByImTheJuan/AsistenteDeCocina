import type { FoodOrigin } from '../generated/prisma/client.js';
import { dietAllows } from './recommendations.js';

// Search, filters and order of the recipe lists. They narrow down the apt
// recipes only: the safety restrictions are applied before, always. See
// docs/decisions/0010-busqueda-y-filtros-de-recetas.md.

/** The diets a list can be filtered by; flexitarian would allow everything. */
export const FILTER_DIETS = ['VEGETARIAN', 'VEGAN', 'PESCATARIAN'] as const;
export type FilterDiet = (typeof FILTER_DIETS)[number];

export const RECIPE_SORTS = ['NAME', 'TIME', 'CALORIES'] as const;
export type RecipeSort = (typeof RECIPE_SORTS)[number];

export type RecipeFilters = {
  /** Every word has to appear in the name or in an ingredient. */
  search?: string;
  maxMinutes?: number;
  /** Per serving. Recipes whose calories are unknown are left out. */
  maxCalories?: number;
  diet?: FilterDiet;
  /** NAME by default. */
  sort?: RecipeSort;
};

export type FilterableRecipe = {
  name: string;
  totalMinutes: number;
  /** Estimated; null when some ingredient lacks the data. */
  caloriesPerServing: number | null;
  ingredients: {
    ingredient: {
      name: string;
      origin: FoodOrigin;
      aliases: { alias: string }[];
    };
  }[];
};

/** Lower case, without accents or extra spaces: 'Salmón' and 'salmon' match. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Every word of the search appears in the name, an ingredient or a synonym. */
export function matchesSearch(
  recipe: FilterableRecipe,
  search: string | undefined,
): boolean {
  const words = normalize(search ?? '')
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return true;
  }
  const texts = [
    recipe.name,
    ...recipe.ingredients.flatMap(({ ingredient }) => [
      ingredient.name,
      ...ingredient.aliases.map(({ alias }) => alias),
    ]),
  ].map(normalize);
  return words.every((word) => texts.some((text) => text.includes(word)));
}

/** The recipe passes the search and every filter given. */
export function matchesFilters(
  recipe: FilterableRecipe,
  filters: RecipeFilters,
): boolean {
  const calories = recipe.caloriesPerServing;
  if (!matchesSearch(recipe, filters.search)) {
    return false;
  }
  if (
    filters.maxMinutes !== undefined &&
    recipe.totalMinutes > filters.maxMinutes
  ) {
    return false;
  }
  // Without the data, the recipe cannot be shown to meet the limit.
  if (
    filters.maxCalories !== undefined &&
    (calories === null || calories > filters.maxCalories)
  ) {
    return false;
  }
  if (
    filters.diet !== undefined &&
    !dietAllows(
      filters.diet,
      recipe.ingredients.map(({ ingredient }) => ingredient.origin),
    )
  ) {
    return false;
  }
  return true;
}

type Sortable = Pick<FilterableRecipe, 'totalMinutes' | 'caloriesPerServing'>;

/**
 * The list in the order chosen; it comes by name, which breaks ties. Unknown
 * calories go last.
 */
export function sortRecipes<T extends Sortable>(
  recipes: T[],
  sort: RecipeSort = 'NAME',
): T[] {
  const sorted = [...recipes];
  if (sort === 'TIME') {
    sorted.sort((a, b) => a.totalMinutes - b.totalMinutes);
  } else if (sort === 'CALORIES') {
    sorted.sort((a, b) => {
      const [x, y] = [a.caloriesPerServing, b.caloriesPerServing];
      if (x === null || y === null) {
        return (x === null ? 1 : 0) - (y === null ? 1 : 0);
      }
      return x - y;
    });
  }
  return sorted;
}
