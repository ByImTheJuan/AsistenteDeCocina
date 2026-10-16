import { describeSoonest, MAX_MISSING, soonestExpiring } from './pantry-recipes';
import { formatCalories, joinNames } from './recipe-format';
import type { RecommendedRecipe } from './recipes-api';

// What a recommendation card says about why the recipe suits the user. The
// API decides the order; these lines explain it with the same data.

export type RecommendationLine = {
  text: string;
  /** Shown as a warning label instead of plain text. */
  warning?: boolean;
};

const inSentence = (names: { name: string }[]) => {
  const list = joinNames(names.map(({ name }) => name));
  return list.charAt(0).toLowerCase() + list.slice(1);
};

/** 'Lleva tomate y aguacate, que te gustan'. */
function describeLiked(liked: RecommendedRecipe['likedIngredients']): string | null {
  if (liked.length === 0) {
    return null;
  }
  return `Lleva ${inSentence(liked)}, ${liked.length === 1 ? 'que te gusta' : 'que te gustan'}`;
}

/**
 * 'Puedes prepararla con lo que tienes en casa', or what is missing when it
 * takes something from home and little is missing. Nothing otherwise.
 */
function describeHome({ pantry }: RecommendedRecipe): string | null {
  if (pantry.canPrepare) {
    return 'Puedes prepararla con lo que tienes en casa';
  }
  if (pantry.using.length > 0 && pantry.missing.length <= MAX_MISSING) {
    return `Te falta: ${inSentence(pantry.missing.map(({ ingredient }) => ingredient))}`;
  }
  return null;
}

/**
 * '520 kcal por ración · Dentro de tu objetivo por comida'. A serving over
 * the goal per meal is a warning. Without the data, it says so instead of a
 * partial figure.
 */
function describeCalories({ perServing, goals }: RecommendedRecipe): RecommendationLine {
  if (perServing.calories === null) {
    return { text: 'Sin datos suficientes para calcular las calorías' };
  }
  const calories = `${formatCalories(perServing.calories)} por ración`;
  const parts = [calories];
  const daily = goals.find(({ kind }) => kind === 'DAILY_CALORIES');
  if (daily?.percent != null) {
    parts.push(`${daily.percent} % de tus calorías diarias`);
  }
  const meal = goals.find(({ kind }) => kind === 'MEAL_CALORIES');
  if (meal?.withinGoal === false) {
    return { text: `${calories} · Supera tu objetivo por comida`, warning: true };
  }
  if (meal?.withinGoal === true) {
    parts.push('Dentro de tu objetivo por comida');
  }
  return { text: parts.join(' · ') };
}

export const UNCERTAIN_ALLERGENS = 'Revisa los alérgenos';

/** The lines of a recommendation card, only those that apply. */
export function describeRecommendation(
  recipe: RecommendedRecipe,
  on: string,
): RecommendationLine[] {
  const lines: RecommendationLine[] = [];
  if (recipe.allergensUncertain) {
    lines.push({ text: UNCERTAIN_ALLERGENS, warning: true });
  }
  const soonest = soonestExpiring(recipe.pantry, on);
  if (soonest) {
    lines.push({ text: describeSoonest(soonest, on), warning: true });
  }
  for (const text of [describeLiked(recipe.likedIngredients), describeHome(recipe)]) {
    if (text) lines.push({ text });
  }
  lines.push(describeCalories(recipe));
  return lines;
}

/** At least this many recommendations before the screen stops warning there are few. */
export const ENOUGH_RECOMMENDATIONS = 3;

const recipes = (count: number) => (count === 1 ? '1 receta' : `${count} recetas`);

/**
 * Why recipes were left out: 'por tus alergias e intolerancias (3) y por tu
 * dieta o los alimentos que no te gustan (5)'. Null when none was.
 */
export function describeLeftOut(hiddenCount: number, excludedCount: number): string | null {
  const reasons = [
    hiddenCount > 0 ? `${recipes(hiddenCount)} por tus alergias e intolerancias` : null,
    excludedCount > 0
      ? `${recipes(excludedCount)} por tu dieta o los alimentos que no te gustan`
      : null,
  ].filter((reason) => reason !== null);
  return reasons.length === 0 ? null : `No te proponemos ${reasons.join(' ni ')}.`;
}
