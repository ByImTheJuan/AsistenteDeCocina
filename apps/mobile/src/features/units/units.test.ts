import {
  formatQuantity,
  parseQuantity,
  quantityToText,
  unitName,
  units,
  unitSchema,
} from './units';

describe('formatQuantity', () => {
  it.each([
    [500, 'GRAM', '500 g'],
    [1.5, 'KILOGRAM', '1,5 kg'],
    [1, 'PIECE', '1 unidad'],
    [3, 'PIECE', '3 unidades'],
    [0.5, 'PIECE', '0,5 unidades'],
    [2, 'TABLESPOON', '2 cucharadas'],
    [1, 'PACKAGE', '1 envase'],
    [0.25, 'LITER', '0,25 l'],
    [100_000, 'GRAM', '100.000 g'],
    [1234.567, 'MILLILITER', '1.234,567 ml'],
  ] as const)('writes %d %s as «%s»', (quantity, unit, expected) => {
    expect(formatQuantity(quantity, unit)).toBe(expected);
  });
});

describe('parseQuantity', () => {
  it.each([
    ['2', 2],
    [' 2 ', 2],
    ['1,5', 1.5],
    ['1.5', 1.5],
    ['0,25', 0.25],
    ['0,001', 0.001],
    ['100000', 100_000],
  ])('reads «%s» as %d', (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  const notNumbers = ['', 'dos', '1,2345', '1.500,5', '-1', '1,', ',5', '1 500'];
  it.each(notNumbers)('does not read «%s»', (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe('quantityToText', () => {
  it('writes decimals with a comma', () => {
    expect(quantityToText(1.25)).toBe('1,25');
    expect(quantityToText(3)).toBe('3');
  });
});

describe('units', () => {
  it('names every unit', () => {
    for (const unit of units) {
      expect(unitName(unit)).toEqual(expect.any(String));
    }
  });

  it('rejects a unit the app does not know', () => {
    expect(unitSchema.safeParse('CUP').success).toBe(false);
  });
});
