import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Unit } from '../generated/prisma/enums.js';
import { IngredientResponse } from '../ingredients/ingredients.dto.js';
import type { InventoryItem, QuantityInput } from './inventory.service.js';

// Wide on purpose: the limits catch typing mistakes. Three decimals, as the
// column stores them (0,250 kg).
export const QUANTITY_RANGE = { min: 0.001, max: 100_000, decimals: 3 };

const quantityProperty = {
  type: 'number' as const,
  nullable: true,
  minimum: QUANTITY_RANGE.min,
  maximum: QUANTITY_RANGE.max,
  description:
    'How much there is, with up to three decimals. Null for a food that is always available in the kitchen; then the unit is null too.',
};

const unitProperty = {
  enum: Unit,
  enumName: 'Unit',
  nullable: true,
  description:
    "Unit of the quantity, one of the ingredient's `units`. Null exactly when the quantity is.",
};

// Both fields are required but nullable: null means "always available".
export class UpdateInventoryItemRequest implements QuantityInput {
  @ApiProperty(quantityProperty)
  @ValidateIf((body: UpdateInventoryItemRequest) => body.quantity !== null)
  @IsNumber({ maxDecimalPlaces: QUANTITY_RANGE.decimals, allowNaN: false })
  @Min(QUANTITY_RANGE.min)
  @Max(QUANTITY_RANGE.max)
  quantity: number | null;

  @ApiProperty(unitProperty)
  @ValidateIf((body: UpdateInventoryItemRequest) => body.unit !== null)
  @IsEnum(Unit)
  unit: Unit | null;
}

export class CreateInventoryItemRequest extends UpdateInventoryItemRequest {
  @ApiProperty({ example: 'ing_tomate', maxLength: 191 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  ingredientId: string;
}

export class InventoryItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: IngredientResponse })
  ingredient: IngredientResponse;

  @ApiProperty(quantityProperty)
  quantity: number | null;

  @ApiProperty(unitProperty)
  unit: Unit | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(item: InventoryItem): InventoryItemResponse {
    return {
      id: item.id,
      ingredient: IngredientResponse.from(item.ingredient),
      quantity: item.quantity === null ? null : item.quantity.toNumber(),
      unit: item.unit,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export class InventoryResponse {
  @ApiProperty({ type: [InventoryItemResponse] })
  items: InventoryItemResponse[];

  static from(items: InventoryItem[]): InventoryResponse {
    return { items: items.map((item) => InventoryItemResponse.from(item)) };
  }
}
