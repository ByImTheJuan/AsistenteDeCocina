import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import type {
  IngredientMeasure,
  Prisma,
  Unit,
} from '../generated/prisma/client.js';
import { withAllergens } from '../ingredients/ingredient-with-allergens.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MEASURE_UNITS } from '../units/units.js';
import {
  inventoryBadRequest,
  inventoryFull,
  inventoryItemNotFound,
} from './inventory.errors.js';

export const MAX_INVENTORY_ITEMS = 500;

const withIngredient = {
  ingredient: { include: withAllergens },
} satisfies Prisma.InventoryItemInclude;

export type InventoryItem = Prisma.InventoryItemGetPayload<{
  include: typeof withIngredient;
}>;

/**
 * A quantity and its unit go together: both are given, or both are null for
 * a food that is always available.
 */
export type QuantityInput = {
  quantity: number | null;
  unit: Unit | null;
};

export type NewInventoryItem = QuantityInput & { ingredientId: string };

// The foods each user has at home. Every query is scoped to the user of the
// access token, so nobody can read or change another user's items.
@Injectable()
export class InventoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** By food name, and in the order they were added for the same food. */
  async list(current: AuthenticatedUser): Promise<InventoryItem[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        inventoryItems: {
          include: withIngredient,
          orderBy: [{ ingredient: { name: 'asc' } }, { createdAt: 'asc' }],
        },
      },
    });
    if (!user) {
      throw invalidAccessToken();
    }
    return user.inventoryItems;
  }

  async add(
    current: AuthenticatedUser,
    input: NewInventoryItem,
  ): Promise<InventoryItem> {
    checkQuantity(input);
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: input.ingredientId },
      select: { measure: true },
    });
    if (!ingredient) {
      throw inventoryBadRequest(
        'unknown_ingredient',
        'The ingredient is not in the catalogue',
      );
    }
    checkUnit(input, ingredient.measure);

    return this.prisma.$transaction(async (tx) => {
      // A valid access token can outlive its account by a few minutes.
      const account = await tx.user.findUnique({
        where: { id: current.id },
        select: { _count: { select: { inventoryItems: true } } },
      });
      if (!account) {
        throw invalidAccessToken();
      }
      if (account._count.inventoryItems >= MAX_INVENTORY_ITEMS) {
        throw inventoryFull(MAX_INVENTORY_ITEMS);
      }
      return tx.inventoryItem.create({
        data: {
          userId: current.id,
          ingredientId: input.ingredientId,
          quantity: input.quantity,
          unit: input.unit,
        },
        include: withIngredient,
      });
    });
  }

  /** Replaces the quantity and unit of one of the user's items. */
  async update(
    current: AuthenticatedUser,
    id: string,
    input: QuantityInput,
  ): Promise<InventoryItem> {
    checkQuantity(input);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id, userId: current.id },
        select: { ingredient: { select: { measure: true } } },
      });
      if (!item) {
        throw inventoryItemNotFound();
      }
      checkUnit(input, item.ingredient.measure);
      return tx.inventoryItem.update({
        where: { id },
        data: { quantity: input.quantity, unit: input.unit },
        include: withIngredient,
      });
    });
  }

  async remove(current: AuthenticatedUser, id: string): Promise<void> {
    const { count } = await this.prisma.inventoryItem.deleteMany({
      where: { id, userId: current.id },
    });
    if (count === 0) {
      throw inventoryItemNotFound();
    }
  }
}

function checkQuantity({ quantity, unit }: QuantityInput): void {
  if ((quantity === null) !== (unit === null)) {
    throw inventoryBadRequest(
      'incomplete_quantity',
      'A quantity needs a unit, and a unit needs a quantity',
    );
  }
}

// Each food takes only the units of its measure: milk in litres, not grams.
function checkUnit({ unit }: QuantityInput, measure: IngredientMeasure): void {
  if (unit !== null && !MEASURE_UNITS[measure].includes(unit)) {
    throw inventoryBadRequest(
      'unit_not_allowed',
      'The food is not measured in that unit',
    );
  }
}

function invalidAccessToken(): UnauthorizedException {
  return new UnauthorizedException('Invalid access token');
}
