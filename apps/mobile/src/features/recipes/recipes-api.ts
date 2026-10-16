import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { ingredientSchema } from '@/features/ingredients/ingredients-api';
import { unitSchema } from '@/features/units/units';

// Null while the recipe has no reviews: never a made-up score.
const ratingSchema = z.object({ average: z.number(), count: z.number() }).nullable();

const ingredientNameSchema = z.object({ id: z.string(), name: z.string() });

const recipeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  totalMinutes: z.number(),
  // The few ingredients that define the dish.
  mainIngredients: z.array(ingredientNameSchema),
  // Some processed ingredient may carry allergens that are not listed.
  allergensUncertain: z.boolean(),
  rating: ratingSchema,
});

// Only the recipes apt for the user's restrictions; `hiddenCount` says how
// many were left out.
const recipeCatalogueSchema = z.object({
  recipes: z.array(recipeSummarySchema),
  hiddenCount: z.number(),
});

// Without a quantity (both quantity and unit null) the ingredient goes to taste.
const recipeIngredientSchema = z.object({
  ingredient: ingredientSchema,
  quantity: z.number().nullable(),
  unit: unitSchema.nullable(),
  note: z.string().nullable(),
  main: z.boolean(),
});

// Allergens are kept as text: one this version does not know must still be
// shown as a conflict, not drop the recipe or the warning.
const recipeSafetySchema = z.object({
  conflictingAllergens: z.array(z.string()),
  conflictingIngredients: z.array(ingredientNameSchema),
  allergensUncertain: z.boolean(),
});

// Estimated from average values of the ingredients. A value is null when some
// ingredient lacks its data; those ingredients are listed.
const recipeNutritionSchema = z.object({
  perServing: z.object({ calories: z.number().nullable(), protein: z.number().nullable() }),
  estimated: z.boolean(),
  missingIngredients: z.array(ingredientNameSchema),
  excludesToTaste: z.boolean(),
});

export const goalKinds = ['DAILY_CALORIES', 'MEAL_CALORIES', 'DAILY_PROTEIN'] as const;
export type GoalKind = (typeof goalKinds)[number];
const isGoalKind = (kind: string): kind is GoalKind => (goalKinds as readonly string[]).includes(kind);

const goalFitSchema = z.object({
  kind: z.string(),
  target: z.number(),
  comparable: z.boolean(),
  percent: z.number().nullable(),
  withinGoal: z.boolean().nullable(),
});

// One serving against each goal the user has switched on. Goals this version
// does not know are left out rather than rejecting the recipe.
const goalFitsSchema = z
  .array(goalFitSchema)
  .transform((fits) =>
    fits.flatMap(({ kind, ...fit }) => (isGoalKind(kind) ? [{ kind, ...fit }] : [])),
  );

const recipeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  totalMinutes: z.number(),
  servings: z.number(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(z.string()),
  rating: ratingSchema,
  safety: recipeSafetySchema,
  nutrition: recipeNutritionSchema,
  goals: goalFitsSchema,
});

export type RecipeRating = z.infer<typeof ratingSchema>;
export type RecipeSummary = z.infer<typeof recipeSummarySchema>;
export type RecipeCatalogue = z.infer<typeof recipeCatalogueSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeSafety = z.infer<typeof recipeSafetySchema>;
export type RecipeNutrition = z.infer<typeof recipeNutritionSchema>;
export type GoalFit = z.infer<typeof goalFitsSchema>[number];
export type RecipeDetail = z.infer<typeof recipeDetailSchema>;

/** The recipes apt for the user, by name. */
export async function getRecipeCatalogue(request: AuthorizedRequest): Promise<RecipeCatalogue> {
  return recipeCatalogueSchema.parse(await request('/recipes'));
}

/** Any recipe of the catalogue, with its conflicts with the user's restrictions. */
export async function getRecipe(request: AuthorizedRequest, id: string): Promise<RecipeDetail> {
  return recipeDetailSchema.parse(await request(`/recipes/${encodeURIComponent(id)}`));
}
