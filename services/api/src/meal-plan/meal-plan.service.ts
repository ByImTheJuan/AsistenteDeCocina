import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { DietaryRestrictions } from '../dietary-restrictions/dietary-restrictions.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { MealType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hasConflicts } from '../recipes/recipe-safety.js';
import { rateRecipe, withIngredients } from '../recipes/recipes.service.js';
import type { RecipeWithIngredients } from '../recipes/recipes.service.js';
import {
  mealPlanBadRequest,
  mealPlanConflict,
  mealPlanEntryNotFound,
} from './meal-plan.errors.js';

/** The longest range of days the plan is read for at once. */
export const MAX_PLAN_DAYS = 31;

const DAY_MS = 24 * 60 * 60 * 1000;

const withRecipe = {
  recipe: { include: withIngredients },
} satisfies Prisma.MealPlanEntryInclude;

type MealPlanEntryRow = Prisma.MealPlanEntryGetPayload<{
  include: typeof withRecipe;
}>;

export type MealPlanEntry = Omit<MealPlanEntryRow, 'recipe'> & {
  /** Read against the user's restrictions as they are now. */
  recipe: RecipeWithIngredients;
};

/** A recipe for a meal of a day (`YYYY-MM-DD`). */
export type MealPlanEntryInput = {
  date: string;
  meal: MealType;
  recipeId: string;
};

// The recipes each user plans to cook. Every query is scoped to the user of
// the access token, so nobody can read or change another user's plan. The
// safety restrictions apply: a recipe that clashes with them cannot be
// planned, and one planned before they changed comes with its conflicts.
@Injectable()
export class MealPlanService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DietaryRestrictionsService)
    private readonly restrictions: DietaryRestrictionsService,
  ) {}

  /** From `from` to `to`, both included, by day and meal of the day. */
  async list(
    current: AuthenticatedUser,
    from: string,
    to: string,
  ): Promise<MealPlanEntry[]> {
    const start = toDay(from);
    const end = toDay(to);
    const days = (end.getTime() - start.getTime()) / DAY_MS + 1;
    if (days < 1 || days > MAX_PLAN_DAYS) {
      throw mealPlanBadRequest(
        'invalid_range',
        `The range must go forward and span ${MAX_PLAN_DAYS} days at most`,
      );
    }
    const restrictions = await this.restrictions.get(current);
    const entries = await this.prisma.mealPlanEntry.findMany({
      where: { userId: current.id, date: { gte: start, lte: end } },
      include: withRecipe,
      // The meals sort in the order of their enum, which is that of the day.
      orderBy: [{ date: 'asc' }, { meal: 'asc' }],
    });
    return entries.map((entry) => rated(entry, restrictions));
  }

  async add(
    current: AuthenticatedUser,
    input: MealPlanEntryInput,
  ): Promise<MealPlanEntry> {
    const restrictions = await this.restrictions.get(current);
    await this.checkRecipe(input.recipeId, restrictions);
    const entry = await saving(() =>
      this.prisma.mealPlanEntry.create({
        data: { userId: current.id, ...toData(input) },
        include: withRecipe,
      }),
    );
    return rated(entry, restrictions);
  }

  /**
   * Moves an entry to another day or meal, or puts another recipe in it. A
   * recipe that was planned before the restrictions changed can still be
   * moved; a new one has to be apt.
   */
  async update(
    current: AuthenticatedUser,
    id: string,
    input: MealPlanEntryInput,
  ): Promise<MealPlanEntry> {
    const restrictions = await this.restrictions.get(current);
    const existing = await this.prisma.mealPlanEntry.findFirst({
      where: { id, userId: current.id },
      select: { recipeId: true },
    });
    if (!existing) {
      throw mealPlanEntryNotFound();
    }
    if (input.recipeId !== existing.recipeId) {
      await this.checkRecipe(input.recipeId, restrictions);
    }
    const entry = await saving(() =>
      this.prisma.mealPlanEntry.update({
        where: { id },
        data: toData(input),
        include: withRecipe,
      }),
    );
    return rated(entry, restrictions);
  }

  async remove(current: AuthenticatedUser, id: string): Promise<void> {
    const { count } = await this.prisma.mealPlanEntry.deleteMany({
      where: { id, userId: current.id },
    });
    if (count === 0) {
      throw mealPlanEntryNotFound();
    }
  }

  private async checkRecipe(
    recipeId: string,
    restrictions: DietaryRestrictions,
  ): Promise<void> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: withIngredients,
    });
    if (!recipe) {
      throw mealPlanBadRequest(
        'unknown_recipe',
        'The recipe is not in the catalogue',
      );
    }
    if (hasConflicts(rateRecipe(recipe, restrictions).safety)) {
      throw mealPlanConflict(
        'recipe_not_allowed',
        'The recipe has something the restrictions of the user forbid',
      );
    }
  }
}

// The meal of a day holds one recipe, which the unique key enforces even when
// two requests race for it.
async function saving<Entry>(write: () => Promise<Entry>): Promise<Entry> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw mealPlanConflict(
          'meal_slot_taken',
          'That meal of that day already has a recipe',
        );
      }
      // A valid access token can outlive its account by a few minutes.
      if (error.code === 'P2003') {
        throw new UnauthorizedException('Invalid access token');
      }
    }
    throw error;
  }
}

function rated(
  entry: MealPlanEntryRow,
  restrictions: DietaryRestrictions,
): MealPlanEntry {
  return { ...entry, recipe: rateRecipe(entry.recipe, restrictions) };
}

// The day is stored at midnight UTC, so it reads back as the same day
// whatever the time zone.
function toDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function toData(input: MealPlanEntryInput) {
  return {
    date: toDay(input.date),
    meal: input.meal,
    recipeId: input.recipeId,
  };
}
