import { z } from 'zod';

import type { QuantityInput } from './inventory-api';

import {
  formatQuantity,
  parseQuantity,
  QUANTITY_MAX,
  QUANTITY_MIN,
  quantityToText,
  unitSchema,
  type Unit,
} from '@/features/units/units';

// The field holds what the user typed; an empty one means "not stated", and
// then the unit is not sent.
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

/** The form for a quantity; without one, the unit offered is `suggestedUnit`. */
export function toForm({ quantity, unit }: QuantityInput, suggestedUnit: Unit): QuantityForm {
  return {
    quantity: quantity === null ? '' : quantityToText(quantity),
    unit: unit ?? suggestedUnit,
  };
}

export function toQuantity(form: QuantityForm): QuantityInput {
  const quantity = parseQuantity(form.quantity);
  return quantity === null ? { quantity: null, unit: null } : { quantity, unit: form.unit };
}

/** "500 g", or that the user did not say how much. */
export function describeQuantity({ quantity, unit }: QuantityInput): string {
  return quantity === null || unit === null
    ? 'Cantidad sin indicar'
    : formatQuantity(quantity, unit);
}
