import type { NutritionGoalKind } from '../generated/prisma/client.js';
import type { NutritionGoals } from '../nutrition-goals/nutrition-goals.service.js';
import type { Nutrients } from './recipe-nutrition.js';

export type GoalFit = {
  kind: NutritionGoalKind;
  /** The value the user set: kcal, or grams of protein. */
  target: number;
  /** False when the recipe lacks the data to compare with the goal. */
  comparable: boolean;
  /** Share of a daily goal one serving takes, in whole percent. */
  percent: number | null;
  /** Whether one serving stays within the goal per meal. */
  withinGoal: boolean | null;
};

/**
 * How one serving stands against the goals the user has switched on. A goal
 * that is switched off keeps its value but is not applied, so it is left out.
 */
export function nutritionGoalsFit(
  perServing: Nutrients,
  goals: NutritionGoals,
): GoalFit[] {
  const fits: GoalFit[] = [];
  const share = (value: number | null, target: number) =>
    value === null ? null : Math.round((value / target) * 100);

  if (goals.dailyCalories?.enabled) {
    const target = goals.dailyCalories.value;
    fits.push({
      kind: 'DAILY_CALORIES',
      target,
      comparable: perServing.calories !== null,
      percent: share(perServing.calories, target),
      withinGoal: null,
    });
  }
  if (goals.mealCalories?.enabled) {
    const target = goals.mealCalories.value;
    fits.push({
      kind: 'MEAL_CALORIES',
      target,
      comparable: perServing.calories !== null,
      percent: null,
      withinGoal:
        perServing.calories === null ? null : perServing.calories <= target,
    });
  }
  if (goals.dailyProtein?.enabled) {
    const target = goals.dailyProtein.value;
    fits.push({
      kind: 'DAILY_PROTEIN',
      target,
      comparable: perServing.protein !== null,
      percent: share(perServing.protein, target),
      withinGoal: null,
    });
  }
  return fits;
}
