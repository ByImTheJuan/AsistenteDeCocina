import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { withAllergens } from '../ingredients/ingredient-with-allergens.js';
import { PrismaService } from '../prisma/prisma.service.js';
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
}> & { safety: RecipeSafety };

export type RecipeCatalogue = {
  /** The recipes apt for the user, by name. */
  recipes: RecipeWithIngredients[];
  /** How many recipes were left out for clashing with the restrictions. */
  hiddenCount: number;
};

// The recipe catalogue, read against the user's safety restrictions, which are
// mandatory: the catalogue never offers a recipe that clashes with them.
@Injectable()
export class RecipesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DietaryRestrictionsService)
    private readonly restrictions: DietaryRestrictionsService,
  ) {}

  async catalogue(current: AuthenticatedUser): Promise<RecipeCatalogue> {
    const restrictions = await this.restrictions.get(current);
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
   * comes with its conflicts so the app can warn about them.
   */
  async detail(current: AuthenticatedUser, id: string): Promise<RecipeDetail> {
    const restrictions = await this.restrictions.get(current);
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: withDetail,
    });
    if (!recipe) {
      throw recipeNotFound();
    }
    return {
      ...recipe,
      safety: recipeSafety(
        recipe.ingredients.map(({ ingredient }) => ingredient),
        restrictions,
      ),
    };
  }
}
