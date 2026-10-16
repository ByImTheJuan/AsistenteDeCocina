import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { DietaryRestrictions } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { withAllergens } from '../ingredients/ingredient-with-allergens.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NutritionGoalsService } from '../nutrition-goals/nutrition-goals.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { nutritionGoalsFit } from './nutrition-goals-fit.js';
import { pantryMatch } from './pantry-match.js';
import type { PantryMatch } from './pantry-match.js';
import type { GoalFit } from './nutrition-goals-fit.js';
import { recipeNutrition } from './recipe-nutrition.js';
import type { RecipeNutrition } from './recipe-nutrition.js';
import { hasConflicts, recipeSafety } from './recipe-safety.js';
import type { RecipeSafety } from './recipe-safety.js';
import { recipeNotFound } from './recipes.errors.js';

const withIngredients = {
  ingredients: {
    orderBy: { position: 'asc' },
    include: { ingredient: { include: withAllergens } },
  },
} satisfies Prisma.RecipeInclude;

const withDetail = {
  ...withIngredients,
  steps: { orderBy: { position: 'asc' } },
} satisfies Prisma.RecipeInclude;

export type RecipeWithIngredients = Prisma.RecipeGetPayload<{
  include: typeof withIngredients;
}> & { safety: RecipeSafety };

export type RecipeDetail = Prisma.RecipeGetPayload<{
  include: typeof withDetail;
}> & {
  safety: RecipeSafety;
  nutrition: RecipeNutrition;
  /** How a serving stands against the goals the user has switched on. */
  goals: GoalFit[];
};

export type RecipeCatalogue = {
  /** The recipes apt for the user, by name. */
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
  ) {}

  async catalogue(current: AuthenticatedUser): Promise<RecipeCatalogue> {
    const restrictions = await this.restrictions.get(current);
    return this.aptRecipes(restrictions);
  }

  /**
   * The apt recipes against the user's pantry. `today` is the user's day
   * (YYYY-MM-DD): from it on, a food past its use-by date does not count.
   */
  async pantry(
    current: AuthenticatedUser,
    today: string,
  ): Promise<PantryRecipes> {
    const [restrictions, items] = await Promise.all([
      this.restrictions.get(current),
      this.inventory.list(current),
    ]);
    const { recipes, hiddenCount } = await this.aptRecipes(restrictions);
    return {
      recipes: recipes.map((recipe) => ({
        ...recipe,
        pantry: pantryMatch(recipe.ingredients, items, today),
      })),
      hiddenCount,
      inventoryEmpty: items.length === 0,
    };
  }

  private async aptRecipes(
    restrictions: DietaryRestrictions,
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
    }));
    const apt = rated.filter(({ safety }) => !hasConflicts(safety));
    return { recipes: apt, hiddenCount: rated.length - apt.length };
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
