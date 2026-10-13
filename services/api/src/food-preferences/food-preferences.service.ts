import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import type { Diet, Ingredient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { foodPreferencesError } from './food-preferences.errors.js';

export type FoodPreferences = {
  diet: Diet | null;
  liked: Ingredient[];
  avoided: Ingredient[];
};

export type FoodPreferencesInput = {
  diet: Diet | null;
  likedIngredientIds: string[];
  avoidedIngredientIds: string[];
};

@Injectable()
export class FoodPreferencesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Empty for a user who has never saved any: there is nothing to set up first. */
  async get(current: AuthenticatedUser): Promise<FoodPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        diet: true,
        ingredientPreferences: {
          select: { kind: true, ingredient: true },
          orderBy: { ingredient: { name: 'asc' } },
        },
      },
    });
    if (!user) {
      throw invalidAccessToken();
    }

    const ofKind = (kind: 'LIKED' | 'AVOIDED') =>
      user.ingredientPreferences
        .filter((preference) => preference.kind === kind)
        .map((preference) => preference.ingredient);
    return {
      diet: user.diet,
      liked: ofKind('LIKED'),
      avoided: ofKind('AVOIDED'),
    };
  }

  /** Replaces the saved preferences with the given ones, all or nothing. */
  async replace(
    current: AuthenticatedUser,
    input: FoodPreferencesInput,
  ): Promise<FoodPreferences> {
    const liked = [...new Set(input.likedIngredientIds)];
    const avoided = [...new Set(input.avoidedIngredientIds)];

    if (avoided.some((id) => liked.includes(id))) {
      throw foodPreferencesError(
        'ingredient_in_both_lists',
        'An ingredient cannot be both liked and avoided',
      );
    }

    const ids = [...liked, ...avoided];
    if (ids.length > 0) {
      const known = await this.prisma.ingredient.count({
        where: { id: { in: ids } },
      });
      if (known !== ids.length) {
        throw foodPreferencesError(
          'unknown_ingredient',
          'Some ingredient is not in the catalogue',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // A valid access token can outlive its account by a few minutes.
      const { count } = await tx.user.updateMany({
        where: { id: current.id },
        data: { diet: input.diet },
      });
      if (count !== 1) {
        throw invalidAccessToken();
      }
      await tx.ingredientPreference.deleteMany({
        where: { userId: current.id },
      });
      await tx.ingredientPreference.createMany({
        data: [
          ...liked.map((ingredientId) => ({
            userId: current.id,
            ingredientId,
            kind: 'LIKED' as const,
          })),
          ...avoided.map((ingredientId) => ({
            userId: current.id,
            ingredientId,
            kind: 'AVOIDED' as const,
          })),
        ],
      });
    });

    return this.get(current);
  }
}

function invalidAccessToken(): UnauthorizedException {
  return new UnauthorizedException('Invalid access token');
}
