import { z } from 'zod';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { ingredientSchema } from '@/features/ingredients/ingredients-api';
import { calendarDaySchema, expiryKindSchema } from '@/features/inventory/expiry';
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
  // Estimated for one serving; null when some ingredient lacks the data.
  caloriesPerServing: z.number().nullable(),
});

// Only the recipes apt for the user's restrictions; `hiddenCount` says how
// many were left out.
const recipeCatalogueSchema = z.object({
  recipes: z.array(recipeSummarySchema),
  hiddenCount: z.number(),
});

const quantitySchema = z.object({ quantity: z.number(), unit: unitSchema });

// How a recipe stands against the pantry. Quantities are compared only between
// units of the same kind; what goes to taste never stops a recipe.
const recipePantrySchema = z.object({
  canPrepare: z.boolean(),
  // Missing or not enough. `expired`: there is some, past its use-by date.
  missing: z.array(
    z.object({
      ingredient: ingredientNameSchema,
      needed: quantitySchema,
      have: quantitySchema.nullable(),
      expired: z.boolean(),
    }),
  ),
  // At home, in units that cannot be compared with the recipe.
  checkQuantity: z.array(ingredientNameSchema),
  // Go to taste and are not at home.
  checkToTaste: z.array(ingredientNameSchema),
  // Taken from home, with the nearest date of the items that count.
  using: z.array(
    z.object({
      ingredient: ingredientNameSchema,
      expiresOn: calendarDaySchema.nullable(),
      dateKind: expiryKindSchema.nullable(),
    }),
  ),
});

const pantryRecipesSchema = z.object({
  recipes: z.array(recipeSummarySchema.extend({ pantry: recipePantrySchema })),
  hiddenCount: z.number(),
  inventoryEmpty: z.boolean(),
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

// The apt recipes that fit the user's diet and tastes, the most suitable
// first, with what explains their place. `hiddenCount`: left out by the
// restrictions; `excludedCount`: by the diet or a food the user dislikes.
const recommendationsSchema = z.object({
  recipes: z.array(
    recipeSummarySchema.extend({
      description: z.string(),
      servings: z.number(),
      likedIngredients: z.array(ingredientNameSchema),
      pantry: recipePantrySchema,
      perServing: z.object({ calories: z.number().nullable(), protein: z.number().nullable() }),
      goals: goalFitsSchema,
    }),
  ),
  hiddenCount: z.number(),
  excludedCount: z.number(),
});

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
export type RecipePantry = z.infer<typeof recipePantrySchema>;
export type PantryRecipe = z.infer<typeof pantryRecipesSchema>['recipes'][number];
export type PantryRecipes = z.infer<typeof pantryRecipesSchema>;
export type Recommendations = z.infer<typeof recommendationsSchema>;
export type RecommendedRecipe = Recommendations['recipes'][number];

const withQuery = (path: string, query: string) => (query ? `${path}?${query}` : path);

/**
 * The recipes apt for the user, by name. `query` (from toQuery) narrows them
 * down with a search and filters, and may sort them otherwise.
 */
export async function getRecipeCatalogue(
  request: AuthorizedRequest,
  query = '',
): Promise<RecipeCatalogue> {
  return recipeCatalogueSchema.parse(await request(withQuery('/recipes', query)));
}

/**
 * The apt recipes against the user's pantry. `today` is the device's day: a
 * food whose use-by date is that day or earlier does not count.
 */
export async function getPantryRecipes(
  request: AuthorizedRequest,
  today: string,
  query = '',
): Promise<PantryRecipes> {
  const day = `today=${encodeURIComponent(today)}`;
  return pantryRecipesSchema.parse(
    await request(`/recipes/pantry?${query ? `${day}&${query}` : day}`),
  );
}

/**
 * The recipes recommended for the user, the most suitable first. `today` is
 * the device's day, as for the pantry.
 */
export async function getRecommendations(
  request: AuthorizedRequest,
  today: string,
): Promise<Recommendations> {
  return recommendationsSchema.parse(
    await request(`/recipes/recommendations?today=${encodeURIComponent(today)}`),
  );
}

/** Any recipe of the catalogue, with its conflicts with the user's restrictions. */
export async function getRecipe(request: AuthorizedRequest, id: string): Promise<RecipeDetail> {
  return recipeDetailSchema.parse(await request(`/recipes/${encodeURIComponent(id)}`));
}
