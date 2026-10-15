import { z } from 'zod';

import type { QuantityInput } from './inventory-api';

import type { Ingredient } from '@/features/ingredients/ingredients-api';

import {
  formatQuantity,
  parseQuantity,
  QUANTITY_MAX,
  QUANTITY_MIN,
  quantityToText,
  unitSchema,
} from '@/features/units/units';

// The field holds what the user typed; an empty one means the food is always
// available, and then the unit is not sent.
export const quantityFormSchema = z.object({
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
});

export type QuantityForm = z.infer<typeof quantityFormSchema>;

/**
 * The form for a quantity of `ingredient`. Without a quantity, or in a unit the
 * food is no longer measured in, it offers the food's suggested unit.
 */
export function toForm({ quantity, unit }: QuantityInput, ingredient: Ingredient): QuantityForm {
  return {
    quantity: quantity === null ? '' : quantityToText(quantity),
    unit: unit !== null && ingredient.units.includes(unit) ? unit : ingredient.defaultUnit,
  };
}

export function toQuantity(form: QuantityForm): QuantityInput {
  const quantity = parseQuantity(form.quantity);
  return quantity === null ? { quantity: null, unit: null } : { quantity, unit: form.unit };
}

/** "500 g", or that the food is always available. */
export function describeQuantity({ quantity, unit }: QuantityInput): string {
  return quantity === null || unit === null ? 'Siempre disponible' : formatQuantity(quantity, unit);
}
