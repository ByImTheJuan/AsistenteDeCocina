import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { DietaryRestrictionsService } from './dietary-restrictions.service.js';

// The rules are exercised against MySQL in
// test/dietary-restrictions.e2e-spec.ts. These tests cover the branches that
// cannot be reached through the HTTP API.
describe('DietaryRestrictionsService', () => {
  const user = { findUnique: vi.fn() };
  const ingredient = { count: vi.fn() };
  const allergenRestriction = { deleteMany: vi.fn(), createMany: vi.fn() };
  const ingredientRestriction = { deleteMany: vi.fn(), createMany: vi.fn() };
  const prisma = {
    user,
    ingredient,
    $transaction: vi.fn((run: (tx: unknown) => unknown) =>
      run({ user, allergenRestriction, ingredientRestriction }),
    ),
  };
  const current = { id: 'user-1', sessionId: null };

  let service: DietaryRestrictionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    user.findUnique.mockResolvedValue({
      id: 'user-1',
      allergenRestrictions: [],
      ingredientRestrictions: [],
      ingredientPreferences: [],
    });
    service = new DietaryRestrictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('stores a restriction once when a list repeats it', async () => {
    ingredient.count.mockResolvedValue(1);

    await service.replace(current, {
      allergens: ['MILK', 'MILK', 'EGG'],
      ingredientIds: ['ing_kiwi', 'ing_kiwi'],
    });

    expect(allergenRestriction.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', allergen: 'MILK' },
        { userId: 'user-1', allergen: 'EGG' },
      ],
    });
    expect(ingredientRestriction.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', ingredientId: 'ing_kiwi' }],
    });
  });

  it('rejects the change when the account no longer exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(
      service.replace(current, { allergens: ['MILK'], ingredientIds: [] }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(allergenRestriction.deleteMany).not.toHaveBeenCalled();
    expect(allergenRestriction.createMany).not.toHaveBeenCalled();
  });

  it('rejects reading the restrictions of an account that no longer exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(service.get(current)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
