import {
  describeQuantity,
  quantityFormSchema,
  toForm,
  toQuantity,
  type QuantityForm,
} from './inventory-item-form';

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
    expect(toForm({ quantity: 0.5, unit: 'LITER' }, 'PIECE')).toEqual({
      quantity: '0,5',
      unit: 'LITER',
    });
  });

  it('offers the suggested unit when there is no quantity', () => {
    expect(toForm({ quantity: null, unit: null }, 'GRAM')).toEqual({ quantity: '', unit: 'GRAM' });
  });

  it('describes a quantity or its absence', () => {
    expect(describeQuantity({ quantity: 500, unit: 'GRAM' })).toBe('500 g');
    expect(describeQuantity({ quantity: null, unit: null })).toBe('Cantidad sin indicar');
  });
});
