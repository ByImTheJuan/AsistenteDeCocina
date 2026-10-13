import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NutritionGoalsService } from './nutrition-goals.service.js';

// The rules are exercised against MySQL in test/nutrition-goals.e2e-spec.ts.
// These tests cover the branches that cannot be reached through the HTTP API.
describe('NutritionGoalsService', () => {
  const user = { findUnique: vi.fn() };
  const nutritionGoal = { deleteMany: vi.fn(), createMany: vi.fn() };
  const prisma = {
    user,
    $transaction: vi.fn((run: (tx: unknown) => unknown) =>
      run({ user, nutritionGoal }),
    ),
  };
  const current = { id: 'user-1', sessionId: null };
  const goals = {
    dailyCalories: { value: 2000, enabled: true },
    mealCalories: null,
    dailyProtein: null,
  };

  let service: NutritionGoalsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NutritionGoalsService(prisma as unknown as PrismaService);
  });

  it('rejects the change when the account no longer exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(service.replace(current, goals)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(nutritionGoal.deleteMany).not.toHaveBeenCalled();
    expect(nutritionGoal.createMany).not.toHaveBeenCalled();
  });

  it('rejects reading the goals of an account that no longer exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(service.get(current)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
