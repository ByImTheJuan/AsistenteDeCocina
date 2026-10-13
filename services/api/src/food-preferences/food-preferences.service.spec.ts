import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { FoodPreferencesService } from './food-preferences.service.js';

// The rules are exercised against MySQL in test/food-preferences.e2e-spec.ts.
// These tests cover the branches that cannot be reached through the HTTP API.
describe('FoodPreferencesService', () => {
  const user = { findUnique: vi.fn(), updateMany: vi.fn() };
  const ingredient = { count: vi.fn() };
  const ingredientPreference = { deleteMany: vi.fn(), createMany: vi.fn() };
  const prisma = {
    user,
    ingredient,
    $transaction: vi.fn((run: (tx: unknown) => unknown) =>
      run({ user, ingredientPreference }),
    ),
  };
  const current = { id: 'user-1', sessionId: null };

  let service: FoodPreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();
    user.findUnique.mockResolvedValue({
      diet: null,
      ingredientPreferences: [],
    });
    user.updateMany.mockResolvedValue({ count: 1 });
    service = new FoodPreferencesService(prisma as unknown as PrismaService);
  });

  it('stores an ingredient once when a list repeats it', async () => {
    ingredient.count.mockResolvedValue(2);

    await service.replace(current, {
      diet: 'VEGAN',
      likedIngredientIds: ['ing_tomate', 'ing_tomate'],
      avoidedIngredientIds: ['ing_ajo'],
    });

    expect(ingredientPreference.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', ingredientId: 'ing_tomate', kind: 'LIKED' },
        { userId: 'user-1', ingredientId: 'ing_ajo', kind: 'AVOIDED' },
      ],
    });
  });

  it('rejects the change when the account no longer exists', async () => {
    user.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.replace(current, {
        diet: null,
        likedIngredientIds: [],
        avoidedIngredientIds: [],
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ingredientPreference.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects reading the preferences of an account that no longer exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(service.get(current)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
