import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import type { Allergen } from '../generated/prisma/client.js';
import { withAllergens } from '../ingredients/ingredient-with-allergens.js';
import type { IngredientWithAllergens } from '../ingredients/ingredient-with-allergens.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type DietaryRestrictions = {
  allergens: Allergen[];
  ingredients: IngredientWithAllergens[];
  /** Liked ingredients the restrictions forbid. */
  conflictingLikedIngredients: IngredientWithAllergens[];
};

export type DietaryRestrictionsInput = {
  allergens: Allergen[];
  ingredientIds: string[];
};

// What the user must not eat. These are safety restrictions: unlike the food
// preferences, whatever reads them has to treat them as mandatory.
@Injectable()
export class DietaryRestrictionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Empty for a user who has never saved any. */
  async get(current: AuthenticatedUser): Promise<DietaryRestrictions> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        allergenRestrictions: { select: { allergen: true } },
        ingredientRestrictions: {
          select: { ingredient: { include: withAllergens } },
          orderBy: { ingredient: { name: 'asc' } },
        },
        ingredientPreferences: {
          where: { kind: 'LIKED' },
          select: { ingredient: { include: withAllergens } },
          orderBy: { ingredient: { name: 'asc' } },
        },
      },
    });
    if (!user) {
      throw invalidAccessToken();
    }

    const allergens = user.allergenRestrictions.map(({ allergen }) => allergen);
    const ingredients = user.ingredientRestrictions.map(
      ({ ingredient }) => ingredient,
    );
    const restrictedIds = new Set(ingredients.map(({ id }) => id));
    // The restriction wins, but the preference is the user's to remove.
    const conflictingLikedIngredients = user.ingredientPreferences
      .map(({ ingredient }) => ingredient)
      .filter(
        (liked) =>
          restrictedIds.has(liked.id) ||
          liked.allergens.some(({ allergen }) => allergens.includes(allergen)),
      );

    return { allergens, ingredients, conflictingLikedIngredients };
  }

  /** Replaces the saved restrictions with the given ones, all or nothing. */
  async replace(
    current: AuthenticatedUser,
    input: DietaryRestrictionsInput,
  ): Promise<DietaryRestrictions> {
    const allergens = [...new Set(input.allergens)];
    const ingredientIds = [...new Set(input.ingredientIds)];

    if (ingredientIds.length > 0) {
      const known = await this.prisma.ingredient.count({
        where: { id: { in: ingredientIds } },
      });
      if (known !== ingredientIds.length) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'unknown_ingredient',
          message: 'Some ingredient is not in the catalogue',
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // A valid access token can outlive its account by a few minutes.
      const account = await tx.user.findUnique({
        where: { id: current.id },
        select: { id: true },
      });
      if (!account) {
        throw invalidAccessToken();
      }
      await tx.allergenRestriction.deleteMany({
        where: { userId: current.id },
      });
      await tx.ingredientRestriction.deleteMany({
        where: { userId: current.id },
      });
      await tx.allergenRestriction.createMany({
        data: allergens.map((allergen) => ({ userId: current.id, allergen })),
      });
      await tx.ingredientRestriction.createMany({
        data: ingredientIds.map((ingredientId) => ({
          userId: current.id,
          ingredientId,
        })),
      });
    });

    return this.get(current);
  }
}

function invalidAccessToken(): UnauthorizedException {
  return new UnauthorizedException('Invalid access token');
}
