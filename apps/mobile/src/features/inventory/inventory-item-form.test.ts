import {
  describeQuantity,
  inventoryItemFormSchema,
  newItemForm,
  toForm,
  toRequest,
  type InventoryItemForm,
} from './inventory-item-form';

import type { Ingredient } from '@/features/ingredients/ingredients-api';

const leche: Ingredient = {
  id: 'ing_leche',
  name: 'Leche',
  category: 'DAIRY_EGG',
  units: ['MILLILITER', 'LITER'],
  defaultUnit: 'LITER',
};

const noStorage = { expiresOn: null, dateKind: null, location: null };
const form = (change: Partial<InventoryItemForm>): InventoryItemForm => ({
  ...newItemForm(),
  ...change,
});

const errorOf = (change: Partial<InventoryItemForm>) => {
  const result = inventoryItemFormSchema.safeParse(form(change));
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
    expect(toRequest(form({ quantity: ' 1,5 ', unit: 'KILOGRAM' }))).toEqual({
      quantity: 1.5,
      unit: 'KILOGRAM',
      ...noStorage,
    });
  });

  it('sends no unit without a quantity', () => {
    expect(toRequest(form({ quantity: '', unit: 'KILOGRAM' }))).toEqual({
      quantity: null,
      unit: null,
      ...noStorage,
    });
  });

  it('sends the date with its kind, and the location', () => {
    expect(
      toRequest(form({ expiresOn: '2026-10-20', dateKind: 'BEST_BEFORE', location: 'FRIDGE' })),
    ).toMatchObject({ expiresOn: '2026-10-20', dateKind: 'BEST_BEFORE', location: 'FRIDGE' });
  });

  it('sends no kind without a date', () => {
    expect(toRequest(form({ expiresOn: null, dateKind: 'BEST_BEFORE' }))).toMatchObject({
      expiresOn: null,
      dateKind: null,
    });
  });

  it('starts a new item without date or location, offering use-by and the usual unit', () => {
    expect(newItemForm(leche)).toEqual({
      quantity: '',
      unit: 'LITER',
      expiresOn: null,
      dateKind: 'USE_BY',
      location: null,
    });
  });

  it('fills the form from a saved quantity', () => {
    expect(toForm({ quantity: 500, unit: 'MILLILITER', ...noStorage }, leche)).toMatchObject({
      quantity: '500',
      unit: 'MILLILITER',
    });
    expect(toForm({ quantity: 0.5, unit: 'LITER', ...noStorage }, leche)).toMatchObject({
      quantity: '0,5',
      unit: 'LITER',
    });
  });

  it('fills the date, its kind and the location', () => {
    expect(
      toForm(
        {
          quantity: null,
          unit: null,
          expiresOn: '2026-10-20',
          dateKind: 'BEST_BEFORE',
          location: 'FREEZER',
        },
        leche,
      ),
    ).toMatchObject({ expiresOn: '2026-10-20', dateKind: 'BEST_BEFORE', location: 'FREEZER' });
  });

  it('offers the suggested unit when there is no quantity', () => {
    expect(toForm({ quantity: null, unit: null, ...noStorage }, leche)).toEqual({
      quantity: '',
      unit: 'LITER',
      expiresOn: null,
      dateKind: 'USE_BY',
      location: null,
    });
  });

  it('offers the suggested unit instead of one the food is no longer measured in', () => {
    expect(toForm({ quantity: 2, unit: 'GRAM', ...noStorage }, leche)).toMatchObject({
      quantity: '2',
      unit: 'LITER',
    });
  });

  it('describes a quantity, or a food that is always available', () => {
    expect(describeQuantity({ quantity: 500, unit: 'GRAM' })).toBe('500 g');
    expect(describeQuantity({ quantity: null, unit: null })).toBe('Siempre disponible');
  });
});
