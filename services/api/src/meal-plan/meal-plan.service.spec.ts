import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { MealPlanService } from './meal-plan.service.js';

// The rules are exercised against MySQL in test/meal-plan.e2e-spec.ts. These
// tests cover the branches that cannot be reached through the HTTP API.
describe('MealPlanService', () => {
  const recipe = { findUnique: vi.fn() };
  const mealPlanEntry = { create: vi.fn() };
  const prisma = { recipe, mealPlanEntry };
  const restrictions = {
    get: vi.fn().mockResolvedValue({ allergens: [], ingredients: [] }),
  };
  const current = { id: 'user-1', sessionId: null };
  const input = {
    date: '2026-10-20',
    meal: 'LUNCH' as const,
    recipeId: 'rec_gazpacho',
  };

  let service: MealPlanService;

  beforeEach(() => {
    vi.clearAllMocks();
    recipe.findUnique.mockResolvedValue({
      id: 'rec_gazpacho',
      servings: 4,
      ingredients: [],
    });
    service = new MealPlanService(
      prisma as unknown as PrismaService,
      restrictions as unknown as DietaryRestrictionsService,
    );
  });

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('failed', {
      code,
      clientVersion: '7.10.0',
    });

  it('says the meal is taken when another request filled it first', async () => {
    mealPlanEntry.create.mockRejectedValue(prismaError('P2002'));

    const added = service.add(current, input);

    await expect(added).rejects.toBeInstanceOf(ConflictException);
    await expect(added).rejects.toMatchObject({
      response: { code: 'meal_slot_taken' },
    });
  });

  it('rejects the token when the account was deleted meanwhile', async () => {
    mealPlanEntry.create.mockRejectedValue(prismaError('P2003'));

    await expect(service.add(current, input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lets any other failure through', async () => {
    const failure = new Error('connection lost');
    mealPlanEntry.create.mockRejectedValue(failure);

    await expect(service.add(current, input)).rejects.toBe(failure);
  });
});
