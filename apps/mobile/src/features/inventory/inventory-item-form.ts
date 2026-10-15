import { z } from 'zod';

import {
  calendarDaySchema,
  expiryKindSchema,
  storageLocationSchema,
} from './expiry';
import type { InventoryItemInput, QuantityInput } from './inventory-api';

import type { Ingredient } from '@/features/ingredients/ingredients-api';

import {
  formatQuantity,
  parseQuantity,
  QUANTITY_MAX,
  QUANTITY_MIN,
  quantityToText,
  unitSchema,
} from '@/features/units/units';

// The quantity field holds what the user typed; an empty one means the food
// is always available, and then the unit is not sent. Without a date, its kind
// is not sent either.
export const inventoryItemFormSchema = z.object({
  quantity: z
    .string()
    .trim()
    .refine(
      (text) => text === '' || parseQuantity(text) !== null,
      'Escribe un número, con hasta tres decimales.',
    )
    .refine((text) => {
      const quantity = parseQuantity(text);
      return quantity === null || (quantity >= QUANTITY_MIN && quantity <= QUANTITY_MAX);
    }, 'Debe ser mayor que 0 y no superar 100.000.'),
  unit: unitSchema,
  expiresOn: calendarDaySchema.nullable(),
  dateKind: expiryKindSchema,
  location: storageLocationSchema.nullable(),
});

export type InventoryItemForm = z.infer<typeof inventoryItemFormSchema>;

/** The form for a new item of `ingredient`. */
export function newItemForm(ingredient?: Ingredient): InventoryItemForm {
  return {
    quantity: '',
    unit: ingredient?.defaultUnit ?? 'PIECE',
    expiresOn: null,
    dateKind: 'USE_BY',
    location: null,
  };
}

/**
 * The form for an item of `ingredient`. Without a quantity, or in a unit the
 * food is no longer measured in, it offers the food's suggested unit; without
 * a date, the kind offered is "use-by".
 */
export function toForm(item: InventoryItemInput, ingredient: Ingredient): InventoryItemForm {
  const { quantity, unit } = item;
  return {
    quantity: quantity === null ? '' : quantityToText(quantity),
    unit: unit !== null && ingredient.units.includes(unit) ? unit : ingredient.defaultUnit,
    expiresOn: item.expiresOn,
    dateKind: item.dateKind ?? 'USE_BY',
    location: item.location,
  };
}

export function toRequest(form: InventoryItemForm): InventoryItemInput {
  const quantity = parseQuantity(form.quantity);
  return {
    ...(quantity === null ? { quantity: null, unit: null } : { quantity, unit: form.unit }),
    expiresOn: form.expiresOn,
    dateKind: form.expiresOn === null ? null : form.dateKind,
    location: form.location,
  };
}

/** "500 g", or that the food is always available. */
export function describeQuantity({ quantity, unit }: QuantityInput): string {
  return quantity === null || unit === null ? 'Siempre disponible' : formatQuantity(quantity, unit);
}
