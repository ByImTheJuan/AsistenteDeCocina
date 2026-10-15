import {
  describeQuantity,
  quantityFormSchema,
  toForm,
  toQuantity,
  type QuantityForm,
} from './inventory-item-form';

import type { Ingredient } from '@/features/ingredients/ingredients-api';

const leche: Ingredient = {
  id: 'ing_leche',
  name: 'Leche',
  category: 'DAIRY_EGG',
  units: ['MILLILITER', 'LITER'],
  defaultUnit: 'LITER',
};

const errorOf = (form: QuantityForm) => {
  const result = quantityFormSchema.safeParse(form);
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe('quantity form', () => {
  it.each(['', '3', '1,5', '0,001', '100000'])('accepts «%s»', (quantity) => {
    expect(errorOf({ quantity, unit: 'GRAM' })).toBeUndefined();
  });

  it.each(['dos', '1,2345', '1.500,5'])('asks for a number instead of «%s»', (quantity) => {
    expect(errorOf({ quantity, unit: 'GRAM' })).toBe(
      'Escribe un número, con hasta tres decimales.',
    );
  });

  it.each(['0', '0,000', '100001'])('rejects the out-of-range «%s»', (quantity) => {
    expect(errorOf({ quantity, unit: 'GRAM' })).toBe(
      'Debe ser mayor que 0 y no superar 100.000.',
    );
  });

  it('sends the quantity with its unit', () => {
    expect(toQuantity({ quantity: ' 1,5 ', unit: 'KILOGRAM' })).toEqual({
      quantity: 1.5,
      unit: 'KILOGRAM',
    });
  });

  it('sends no unit without a quantity', () => {
    expect(toQuantity({ quantity: '', unit: 'KILOGRAM' })).toEqual({ quantity: null, unit: null });
  });

  it('fills the form from a saved quantity', () => {
    expect(toForm({ quantity: 500, unit: 'MILLILITER' }, leche)).toEqual({
      quantity: '500',
      unit: 'MILLILITER',
    });
    expect(toForm({ quantity: 0.5, unit: 'LITER' }, leche)).toEqual({
      quantity: '0,5',
      unit: 'LITER',
    });
  });

  it('offers the suggested unit when there is no quantity', () => {
    expect(toForm({ quantity: null, unit: null }, leche)).toEqual({ quantity: '', unit: 'LITER' });
  });

  it('offers the suggested unit instead of one the food is no longer measured in', () => {
    expect(toForm({ quantity: 2, unit: 'GRAM' }, leche)).toEqual({ quantity: '2', unit: 'LITER' });
  });

  it('describes a quantity, or a food that is always available', () => {
    expect(describeQuantity({ quantity: 500, unit: 'GRAM' })).toBe('500 g');
    expect(describeQuantity({ quantity: null, unit: null })).toBe('Siempre disponible');
  });
});
