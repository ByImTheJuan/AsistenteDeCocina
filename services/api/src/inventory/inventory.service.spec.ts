import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { InventoryService } from './inventory.service.js';

// The rules are exercised against MySQL in test/inventory.e2e-spec.ts. These
// tests cover the branches that cannot be reached through the HTTP API.
describe('InventoryService', () => {
  const user = { findUnique: vi.fn() };
  const ingredient = { findUnique: vi.fn() };
  const inventoryItem = { create: vi.fn() };
  const prisma = {
    user,
    ingredient,
    $transaction: vi.fn((run: (tx: unknown) => unknown) =>
      run({ user, inventoryItem }),
    ),
  };
  const current = { id: 'user-1', sessionId: null };

  let service: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryService(prisma as unknown as PrismaService);
  });

  it('adds nothing when the account no longer exists', async () => {
    ingredient.findUnique.mockResolvedValue({ measure: 'WEIGHT' });
    user.findUnique.mockResolvedValue(null);

    await expect(
      service.add(current, {
        ingredientId: 'ing_arroz',
        quantity: 1,
        unit: 'KILOGRAM',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(inventoryItem.create).not.toHaveBeenCalled();
  });
});
