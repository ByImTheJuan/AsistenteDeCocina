import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { DietaryRestrictions } from '../dietary-restrictions/dietary-restrictions.service.js';
import { FoodPreferencesService } from '../food-preferences/food-preferences.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { withAllergens } from '../ingredients/ingredient-with-allergens.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NutritionGoalsService } from '../nutrition-goals/nutrition-goals.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { nutritionGoalsFit } from './nutrition-goals-fit.js';
import { pantryMatch } from './pantry-match.js';
import type { PantryMatch } from './pantry-match.js';
import type { GoalFit } from './nutrition-goals-fit.js';
import { matchesFilters, sortRecipes } from './recipe-filters.js';
import type { RecipeFilters } from './recipe-filters.js';
import { recipeNutrition } from './recipe-nutrition.js';
import {
  isRecommendable,
  likedIngredients,
  recommendationScore,
} from './recommendations.js';
import type { RecipeNutrition } from './recipe-nutrition.js';
import { hasConflicts, recipeSafety } from './recipe-safety.js';
import type { RecipeSafety } from './recipe-safety.js';
import { recipeNotFound } from './recipes.errors.js';

// Synonyms too, so the search finds 'papa' in a recipe with potato.
const withIngredients = {
  ingredients: {
    orderBy: { position: 'asc' },
    include: { ingredient: { include: { ...withAllergens, aliases: true } } },
  },
} satisfies Prisma.RecipeInclude;

const withDetail = {
  ...withIngredients,
  steps: { orderBy: { position: 'asc' } },
} satisfies Prisma.RecipeInclude;

export type RecipeWithIngredients = Prisma.RecipeGetPayload<{
  include: typeof withIngredients;
}> & {
  safety: RecipeSafety;
  /** Estimated; null when some ingredient lacks the data. */
  caloriesPerServing: number | null;
};

export type RecipeDetail = Prisma.RecipeGetPayload<{
  include: typeof withDetail;
}> & {
  safety: RecipeSafety;
  nutrition: RecipeNutrition;
  /** How a serving stands against the goals the user has switched on. */
  goals: GoalFit[];
};

export type RecipeCatalogue = {
  /** The recipes apt for the user that pass the filters, by name or as sorted. */
  recipes: RecipeWithIngredients[];
  /** How many recipes were left out for clashing with the restrictions. */
  hiddenCount: number;
};

export type PantryRecipes = {
  /** The recipes apt for the user, by name, against what there is at home. */
  recipes: (RecipeWithIngredients & { pantry: PantryMatch })[];
  hiddenCount: number;
  /** The user has nothing at home yet. */
  inventoryEmpty: boolean;
};

export type RecommendedRecipe = RecipeWithIngredients & {
  /** Ingredients of the recipe the user likes, in recipe order. */
  likedIngredients: { id: string; name: string }[];
  pantry: PantryMatch;
  nutrition: RecipeNutrition;
  goals: GoalFit[];
};

export type Recommendations = {
  /** The apt recipes that fit the user's tastes, the most suitable first. */
  recipes: RecommendedRecipe[];
  /** Recipes left out for clashing with the restrictions. */
  hiddenCount: number;
  /** Apt recipes left out for the diet or a food the user does not like. */
  excludedCount: number;
};

// The recipe catalogue, read against the user's safety restrictions, which are
// mandatory: the catalogue never offers a recipe that clashes with them.
@Injectable()
export class RecipesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DietaryRestrictionsService)
    private readonly restrictions: DietaryRestrictionsService,
    @Inject(NutritionGoalsService)
    private readonly nutritionGoals: NutritionGoalsService,
    @Inject(InventoryService)
    private readonly inventory: InventoryService,
    @Inject(FoodPreferencesService)
    private readonly preferences: FoodPreferencesService,
  ) {}

  async catalogue(
    current: AuthenticatedUser,
    filters: RecipeFilters = {},
  ): Promise<RecipeCatalogue> {
    const restrictions = await this.restrictions.get(current);
    return this.aptRecipes(restrictions, filters);
  }

  /**
   * The apt recipes against the user's pantry. `today` is the user's day
   * (YYYY-MM-DD): from it on, a food past its use-by date does not count.
   */
  async pantry(
    current: AuthenticatedUser,
    today: string,
    filters: RecipeFilters = {},
  ): Promise<PantryRecipes> {
    const [restrictions, items] = await Promise.all([
      this.restrictions.get(current),
      this.inventory.list(current),
    ]);
    const { recipes, hiddenCount } = await this.aptRecipes(
      restrictions,
      filters,
    );
    return {
      recipes: recipes.map((recipe) => ({
        ...recipe,
        pantry: pantryMatch(recipe.ingredients, items, today),
      })),
      hiddenCount,
      inventoryEmpty: items.length === 0,
    };
  }

  /**
   * The apt recipes that fit the user's diet and tastes, in the order they are
   * recommended: liked ingredients, the pantry (`today` as in `pantry`) and
   * the goal per meal move them up or down; the name breaks ties.
   */
  async recommendations(
    current: AuthenticatedUser,
    today: string,
  ): Promise<Recommendations> {
    const [restrictions, tastes, goals, items] = await Promise.all([
      this.restrictions.get(current),
      this.preferences.get(current),
      this.nutritionGoals.get(current),
      this.inventory.list(current),
    ]);
    const { recipes, hiddenCount } = await this.aptRecipes(restrictions);
    const fitting = recipes.filter((recipe) =>
      isRecommendable(
        recipe.ingredients.map(({ ingredient }) => ingredient),
        tastes,
      ),
    );
    const scored = fitting.map((recipe) => {
      const liked = likedIngredients(
        recipe.ingredients.map(({ ingredient }) => ingredient),
        tastes,
      );
      const pantry = pantryMatch(recipe.ingredients, items, today);
      const nutrition = recipeNutrition(recipe.ingredients, recipe.servings);
      const fits = nutritionGoalsFit(nutrition.perServing, goals);
      const score = recommendationScore(
        {
          likedCount: liked.length,
          pantry,
          goals: fits,
          allergensUncertain: recipe.safety.allergensUncertain,
        },
        today,
      );
      return {
        recipe: {
          ...recipe,
          likedIngredients: liked,
          pantry,
          nutrition,
          goals: fits,
        },
        score,
      };
    });
    // A stable sort: equal scores keep the order by name.
    scored.sort((a, b) => b.score - a.score);
    return {
      recipes: scored.map(({ recipe }) => recipe),
      hiddenCount,
      excludedCount: recipes.length - fitting.length,
    };
  }

  /**
   * The recipes with no conflict with the restrictions that pass the
   * filters. `hiddenCount` counts the conflicts in the whole catalogue,
   * whatever the filters.
   */
  private async aptRecipes(
    restrictions: DietaryRestrictions,
    filters: RecipeFilters = {},
  ): Promise<RecipeCatalogue> {
    const recipes = await this.prisma.recipe.findMany({
      include: withIngredients,
      orderBy: { name: 'asc' },
    });
    const rated = recipes.map((recipe) => ({
      ...recipe,
      safety: recipeSafety(
        recipe.ingredients.map(({ ingredient }) => ingredient),
        restrictions,
      ),
      caloriesPerServing: recipeNutrition(recipe.ingredients, recipe.servings)
        .perServing.calories,
    }));
    const apt = rated.filter(({ safety }) => !hasConflicts(safety));
    const found = apt.filter((recipe) => matchesFilters(recipe, filters));
    return {
      recipes: sortRecipes(found, filters.sort),
      hiddenCount: rated.length - apt.length,
    };
  }

  /**
   * Any recipe of the catalogue, also one hidden from the user's list: it
   * comes with its conflicts so the app can warn about them. Its estimated
   * nutrition per serving is compared with the user's goals.
   */
  async detail(current: AuthenticatedUser, id: string): Promise<RecipeDetail> {
    const [restrictions, goals] = await Promise.all([
      this.restrictions.get(current),
      this.nutritionGoals.get(current),
    ]);
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: withDetail,
    });
    if (!recipe) {
      throw recipeNotFound();
    }
    const nutrition = recipeNutrition(recipe.ingredients, recipe.servings);
    return {
      ...recipe,
      safety: recipeSafety(
        recipe.ingredients.map(({ ingredient }) => ingredient),
        restrictions,
      ),
      nutrition,
      goals: nutritionGoalsFit(nutrition.perServing, goals),
    };
  }
}
