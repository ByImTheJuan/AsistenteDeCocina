import type { RecipeIngredient, RecipeRating, RecipeSafety } from './recipes-api';

import { allergenLabels } from '@/features/dietary-restrictions/labels';
import type { Allergen } from '@/features/dietary-restrictions/dietary-restrictions-api';
import { formatQuantity } from '@/features/units/units';

/** '45 min', '1 h', '2 h 20 min'. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** '4 raciones', '1 ración'. */
export function formatServings(servings: number): string {
  return servings === 1 ? '1 ración' : `${servings} raciones`;
}

/** 'Sin valoraciones' until someone rates the recipe; never a made-up score. */
export function formatRating(rating: RecipeRating): string {
  if (rating === null || rating.count === 0) {
    return 'Sin valoraciones';
  }
  const average = (Math.round(rating.average * 10) / 10).toString().replace('.', ',');
  return `${average} · ${rating.count === 1 ? '1 valoración' : `${rating.count} valoraciones`}`;
}

/** 'Patata, huevo y cebolla': a list as written in a sentence. */
export function joinNames(names: string[]): string {
  const [first, ...rest] = names;
  if (first === undefined) {
    return '';
  }
  const items = [first, ...rest.map((name) => name.charAt(0).toLowerCase() + name.slice(1))];
  return items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/** '4 unidades, medianas', '200 ml', 'al gusto'. */
export function describeAmount({ quantity, unit, note }: RecipeIngredient): string {
  if (quantity === null || unit === null) {
    return note ?? 'al gusto';
  }
  const amount = formatQuantity(quantity, unit);
  return note ? `${amount}, ${note}` : amount;
}

function allergenName(allergen: string): string {
  return allergenLabels[allergen as Allergen]?.name ?? allergen;
}

export function hasConflicts(safety: RecipeSafety): boolean {
  return safety.conflictingAllergens.length > 0 || safety.conflictingIngredients.length > 0;
}

/** What of the user's restrictions the recipe contains: 'huevo y patata'. */
export function describeConflicts(safety: RecipeSafety): string {
  return joinNames([
    ...safety.conflictingAllergens.map(allergenName),
    ...safety.conflictingIngredients.map(({ name }) => name),
  ]);
}
