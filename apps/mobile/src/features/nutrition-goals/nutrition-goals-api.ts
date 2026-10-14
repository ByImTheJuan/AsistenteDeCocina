import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';

// A goal switched off keeps its value but is not applied.
const goalSchema = z.object({ value: z.number(), enabled: z.boolean() }).nullable();

// Null for the goals the user has not set.
const nutritionGoalsSchema = z.object({
  dailyCalories: goalSchema,
  mealCalories: goalSchema,
  dailyProtein: goalSchema,
});

export type NutritionGoals = z.infer<typeof nutritionGoalsSchema>;
export type NutritionGoalField = keyof NutritionGoals;

/** In the order they are shown. */
export const nutritionGoalFields = [
  'dailyCalories',
  'mealCalories',
  'dailyProtein',
] as const satisfies readonly NutritionGoalField[];

export async function getNutritionGoals(request: AuthorizedRequest): Promise<NutritionGoals> {
  return nutritionGoalsSchema.parse(await request('/nutrition-goals'));
}

/** Replaces the saved goals with the given ones; a null goal is removed. */
export async function saveNutritionGoals(
  request: AuthorizedRequest,
  goals: NutritionGoals,
): Promise<NutritionGoals> {
  return nutritionGoalsSchema.parse(
    await request('/nutrition-goals', { method: 'PUT', body: goals }),
  );
}
