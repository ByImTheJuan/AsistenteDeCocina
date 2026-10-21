import { z } from 'zod';

import { mealTypeSchema } from './week';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { calendarDaySchema } from '@/features/inventory/expiry';
import { recipeSummarySchema } from '@/features/recipes/recipes-api';

// A recipe planned for a meal of a day. `recipeConflicts`: the restrictions
// changed after it was planned and the recipe now clashes with them.
const mealPlanEntrySchema = z.object({
  id: z.string(),
  date: calendarDaySchema,
  meal: mealTypeSchema,
  recipe: recipeSummarySchema,
  recipeConflicts: z.boolean(),
});

const mealPlanSchema = z.object({ entries: z.array(mealPlanEntrySchema) });

export type MealPlanEntry = z.infer<typeof mealPlanEntrySchema>;
export type MealPlan = z.infer<typeof mealPlanSchema>;

/** A recipe for a meal of a day; each meal of a day holds one. */
export type MealPlanEntryInput = Pick<MealPlanEntry, 'date' | 'meal'> & { recipeId: string };

/** From `from` to `to`, both included, by day and meal of the day. */
export async function getMealPlan(
  request: AuthorizedRequest,
  from: string,
  to: string,
): Promise<MealPlan> {
  return mealPlanSchema.parse(await request(`/meal-plan?from=${from}&to=${to}`));
}

export async function addMealPlanEntry(
  request: AuthorizedRequest,
  input: MealPlanEntryInput,
): Promise<MealPlanEntry> {
  return mealPlanEntrySchema.parse(await request('/meal-plan', { method: 'POST', body: input }));
}

export async function updateMealPlanEntry(
  request: AuthorizedRequest,
  id: string,
  input: MealPlanEntryInput,
): Promise<MealPlanEntry> {
  return mealPlanEntrySchema.parse(
    await request(`/meal-plan/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
  );
}

export async function removeMealPlanEntry(request: AuthorizedRequest, id: string): Promise<void> {
  await request(`/meal-plan/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
