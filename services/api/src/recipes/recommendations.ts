import type { Diet, FoodOrigin } from '../generated/prisma/client.js';
import type { GoalFit } from './nutrition-goals-fit.js';
import type { PantryMatch } from './pantry-match.js';

// Recommendations are the apt recipes (no conflict with the restrictions,
// which recipeSafety enforces first) that also fit the user's tastes, in an
// order that is fixed and can be explained: each signal adds or takes away
// points, and the name breaks ties. See
// docs/decisions/0009-recomendaciones-personalizadas.md.

const FORBIDDEN_ORIGINS: Record<Diet, FoodOrigin[]> = {
  VEGAN: ['ANIMAL_PRODUCT', 'FISH', 'MEAT'],
  VEGETARIAN: ['FISH', 'MEAT'],
  PESCATARIAN: ['MEAT'],
  FLEXITARIAN: [],
};

/** Whether a diet allows foods of these origins. No diet allows everything. */
export function dietAllows(diet: Diet | null, origins: FoodOrigin[]): boolean {
  if (diet === null) {
    return true;
  }
  const forbidden = FORBIDDEN_ORIGINS[diet];
  return origins.every((origin) => !forbidden.includes(origin));
}

type ProfileIngredient = { id: string; name: string; origin: FoodOrigin };

/** The tastes of a user: preferences, not safety restrictions. */
export type Tastes = {
  diet: Diet | null;
  liked: { id: string }[];
  avoided: { id: string }[];
};

/**
 * A recipe is recommended when the diet allows all its ingredients and none
 * of them is one the user does not like. It stays in the catalogue anyway.
 */
export function isRecommendable(
  ingredients: ProfileIngredient[],
  tastes: Tastes,
): boolean {
  const avoided = new Set(tastes.avoided.map(({ id }) => id));
  return (
    dietAllows(
      tastes.diet,
      ingredients.map(({ origin }) => origin),
    ) && ingredients.every(({ id }) => !avoided.has(id))
  );
}

/** The ingredients of the recipe the user likes, once each, in recipe order. */
export function likedIngredients(
  ingredients: ProfileIngredient[],
  tastes: Tastes,
): { id: string; name: string }[] {
  const liked = new Set(tastes.liked.map(({ id }) => id));
  return ingredients
    .filter(
      ({ id }, index) =>
        liked.has(id) &&
        ingredients.findIndex((other) => other.id === id) === index,
    )
    .map(({ id, name }) => ({ id, name }));
}

/** At most this many missing ingredients still count as almost ready. */
export const MAX_MISSING = 3;
/** Foods that expire within this many days expire soon, as in the app. */
export const EXPIRING_SOON_DAYS = 3;

export const SCORE = {
  /** For each liked ingredient, up to MAX_LIKED of them. */
  liked: 3,
  canPrepare: 3,
  almostReady: 1,
  usesExpiringSoon: 2,
  withinMealGoal: 2,
  overMealGoal: -4,
  allergensUncertain: -1,
} as const;
const MAX_LIKED = 3;

export type ScoreInput = {
  likedCount: number;
  pantry: PantryMatch;
  goals: GoalFit[];
  allergensUncertain: boolean;
};

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** How well a recipe suits the user: the higher, the sooner it is offered. */
export function recommendationScore(input: ScoreInput, today: string): number {
  const { pantry } = input;
  const soonLimit = addDays(today, EXPIRING_SOON_DAYS);
  const mealGoal = input.goals.find(({ kind }) => kind === 'MEAL_CALORIES');

  let score = Math.min(input.likedCount, MAX_LIKED) * SCORE.liked;
  if (pantry.canPrepare) {
    score += SCORE.canPrepare;
  } else if (pantry.missing.length <= MAX_MISSING && pantry.using.length > 0) {
    score += SCORE.almostReady;
  }
  if (
    pantry.using.some(
      ({ expiresOn }) => expiresOn !== null && expiresOn <= soonLimit,
    )
  ) {
    score += SCORE.usesExpiringSoon;
  }
  if (mealGoal?.withinGoal === true) {
    score += SCORE.withinMealGoal;
  } else if (mealGoal?.withinGoal === false) {
    score += SCORE.overMealGoal;
  }
  if (input.allergensUncertain) {
    score += SCORE.allergensUncertain;
  }
  return score;
}
