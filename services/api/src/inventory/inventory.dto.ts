import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  ExpiryKind,
  StorageLocation,
  Unit,
} from '../generated/prisma/enums.js';
import { IngredientResponse } from '../ingredients/ingredients.dto.js';
import type { InventoryItem, InventoryItemInput } from './inventory.service.js';

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

// Wide on purpose: the limits catch typing mistakes, not old food.
export const DATE_RANGE = { min: '2000-01-01', max: '2100-12-31' };

const expiresOnProperty = {
  type: 'string' as const,
  format: 'date',
  nullable: true,
  example: '2026-10-20',
  description: `Calendar day (YYYY-MM-DD) on the label, from ${DATE_RANGE.min} to ${DATE_RANGE.max}. Null when the user does not know it; then the kind is null too.`,
};

const dateKindProperty = {
  enum: ExpiryKind,
  enumName: 'ExpiryKind',
  nullable: true,
  description:
    'What the date means: use-by (do not eat after it) or best-before (may lose quality). Null exactly when the date is.',
};

const locationProperty = {
  enum: StorageLocation,
  enumName: 'StorageLocation',
  nullable: true,
  description: 'Where the food is kept. Null when the user does not say.',
};

@ValidatorConstraint({ name: 'dateInRange' })
class DateInRange implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      value >= DATE_RANGE.min &&
      value <= DATE_RANGE.max
    );
  }

  defaultMessage(): string {
    return `expiresOn must be between ${DATE_RANGE.min} and ${DATE_RANGE.max}`;
  }
}

// Every field is required but nullable. A null quantity means "always
// available"; a null date, location or kind, "not known".
export class UpdateInventoryItemRequest implements InventoryItemInput {
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

  @ApiProperty(expiresOnProperty)
  @ValidateIf((body: UpdateInventoryItemRequest) => body.expiresOn !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expiresOn must be YYYY-MM-DD' })
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(DateInRange)
  expiresOn: string | null;

  @ApiProperty(dateKindProperty)
  @ValidateIf((body: UpdateInventoryItemRequest) => body.dateKind !== null)
  @IsEnum(ExpiryKind)
  dateKind: ExpiryKind | null;

  @ApiProperty(locationProperty)
  @ValidateIf((body: UpdateInventoryItemRequest) => body.location !== null)
  @IsEnum(StorageLocation)
  location: StorageLocation | null;
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

  @ApiProperty(expiresOnProperty)
  expiresOn: string | null;

  @ApiProperty(dateKindProperty)
  dateKind: ExpiryKind | null;

  @ApiProperty(locationProperty)
  location: StorageLocation | null;

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
      expiresOn:
        item.expiresOn === null
          ? null
          : item.expiresOn.toISOString().slice(0, 10),
      dateKind: item.dateKind,
      location: item.location,
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
