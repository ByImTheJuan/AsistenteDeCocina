import type { GoalFit, RecipeIngredient, RecipeRating, RecipeSafety } from './recipes-api';

import { allergenLabels } from '@/features/dietary-restrictions/labels';
import type { Allergen } from '@/features/dietary-restrictions/dietary-restrictions-api';
import { formatNumber, formatQuantity } from '@/features/units/units';

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

/**
 * '4 unidades, medianas', '200 ml', 'al gusto'. `scale` turns the quantity of
 * the recipe's servings into that of the servings chosen.
 */
export function describeAmount(
  { quantity, unit, note }: RecipeIngredient,
  scale = 1,
): string {
  if (quantity === null || unit === null) {
    return note ?? 'al gusto';
  }
  const amount = formatQuantity(quantity * scale, unit);
  return note ? `${amount}, ${note}` : amount;
}

/** '678 kcal'. */
export function formatCalories(calories: number): string {
  return `${formatNumber(calories)} kcal`;
}

/** '14,4 g de proteínas'. */
export function formatProtein(protein: number): string {
  return `${formatNumber(protein)} g de proteínas`;
}

const goalNames: Record<GoalFit['kind'], (target: number) => string> = {
  DAILY_CALORIES: (target) => `tus ${formatCalories(target)} diarias`,
  MEAL_CALORIES: (target) => `tu objetivo de ${formatCalories(target)} por comida`,
  DAILY_PROTEIN: (target) => `tus ${formatNumber(target)} g de proteínas diarias`,
};

/**
 * How one serving stands against a goal: 'Una ración: 34 % de tus 2.000 kcal
 * diarias', 'Supera tu objetivo de 600 kcal por comida'.
 */
export function describeGoalFit({ kind, target, comparable, percent, withinGoal }: GoalFit): string {
  const goal = goalNames[kind](target);
  if (!comparable) {
    return `No se puede comparar con ${goal}: faltan datos de algún ingrediente.`;
  }
  if (kind === 'MEAL_CALORIES') {
    return withinGoal ? `Una ración está dentro de ${goal}.` : `Una ración supera ${goal}.`;
  }
  return `Una ración: ${percent} % de ${goal}.`;
}

/** A serving above the goal per meal: shown as a warning. */
export function exceedsGoal({ kind, comparable, withinGoal }: GoalFit): boolean {
  return kind === 'MEAL_CALORIES' && comparable && withinGoal === false;
}

// One this version does not know is still a conflict, named generically.
function allergenName(allergen: string): string {
  return allergenLabels[allergen as Allergen]?.name ?? 'otro alérgeno';
}

export function hasConflicts(safety: RecipeSafety): boolean {
  return safety.conflictingAllergens.length > 0 || safety.conflictingIngredients.length > 0;
}

/**
 * What of the user's restrictions the recipe contains, to go inside a
 * sentence: 'huevo y patata'.
 */
export function describeConflicts(safety: RecipeSafety): string {
  const names = joinNames([
    ...safety.conflictingAllergens.map(allergenName),
    ...safety.conflictingIngredients.map(({ name }) => name),
  ]);
  return names.charAt(0).toLowerCase() + names.slice(1);
}
