import { IngredientMeasure, Unit } from '../generated/prisma/enums.js';
import {
  canConvert,
  combineQuantities,
  convert,
  MEASURE_UNITS,
  UNITS,
} from './units.js';

describe('units', () => {
  it('defines every unit of the enum', () => {
    expect(Object.keys(UNITS).sort()).toEqual(Object.values(Unit).sort());
  });

  describe('convert', () => {
    it.each([
      [1.5, Unit.KILOGRAM, Unit.GRAM, 1500],
      [250, Unit.GRAM, Unit.KILOGRAM, 0.25],
      [2, Unit.LITER, Unit.MILLILITER, 2000],
      [3, Unit.TABLESPOON, Unit.MILLILITER, 45],
      [2, Unit.TEASPOON, Unit.TABLESPOON, 0.667],
      [4, Unit.PIECE, Unit.PIECE, 4],
    ])('converts %d %s into %s', (quantity, from, to, expected) => {
      expect(convert(quantity, from, to)).toBe(expected);
    });

    it.each([
      [Unit.PIECE, Unit.GRAM],
      [Unit.GRAM, Unit.MILLILITER],
      [Unit.LITER, Unit.KILOGRAM],
      [Unit.PINCH, Unit.GRAM],
      [Unit.TEASPOON, Unit.PINCH],
    ])('does not convert %s into %s', (from, to) => {
      expect(canConvert(from, to)).toBe(false);
      expect(convert(1, from, to)).toBeNull();
    });
  });

  describe('MEASURE_UNITS', () => {
    it('gives every measure units that convert into each other or count', () => {
      expect(Object.keys(MEASURE_UNITS).sort()).toEqual(
        Object.values(IngredientMeasure).sort(),
      );
      expect(MEASURE_UNITS.VOLUME).toEqual([Unit.MILLILITER, Unit.LITER]);
      expect(MEASURE_UNITS.COUNT_OR_WEIGHT).toEqual([
        Unit.PIECE,
        Unit.GRAM,
        Unit.KILOGRAM,
      ]);
    });

    it('offers no spoons or pinches for the inventory', () => {
      const offered = Object.values(MEASURE_UNITS).flat();
      for (const recipeUnit of [Unit.TABLESPOON, Unit.TEASPOON, Unit.PINCH]) {
        expect(offered).not.toContain(recipeUnit);
      }
    });
  });

  describe('combineQuantities', () => {
    const tomato = 'ing_tomate';
    const milk = 'ing_leche';

    it('adds quantities of the same ingredient and kind', () => {
      expect(
        combineQuantities([
          { ingredientId: tomato, quantity: 500, unit: Unit.GRAM },
          { ingredientId: tomato, quantity: 1, unit: Unit.KILOGRAM },
        ]),
      ).toEqual([{ ingredientId: tomato, quantity: 1.5, unit: Unit.KILOGRAM }]);
    });

    it('gives small totals in the base unit', () => {
      expect(
        combineQuantities([
          { ingredientId: milk, quantity: 2, unit: Unit.TABLESPOON },
          { ingredientId: milk, quantity: 100, unit: Unit.MILLILITER },
        ]),
      ).toEqual([{ ingredientId: milk, quantity: 130, unit: Unit.MILLILITER }]);
    });

    it('keeps quantities of different kinds apart', () => {
      expect(
        combineQuantities([
          { ingredientId: tomato, quantity: 3, unit: Unit.PIECE },
          { ingredientId: tomato, quantity: 200, unit: Unit.GRAM },
          { ingredientId: tomato, quantity: 2, unit: Unit.PIECE },
        ]),
      ).toEqual([
        { ingredientId: tomato, quantity: 5, unit: Unit.PIECE },
        { ingredientId: tomato, quantity: 200, unit: Unit.GRAM },
      ]);
    });

    it('never combines a pinch with other units', () => {
      expect(
        combineQuantities([
          { ingredientId: 'ing_canela', quantity: 1, unit: Unit.PINCH },
          { ingredientId: 'ing_canela', quantity: 1, unit: Unit.TEASPOON },
          { ingredientId: 'ing_canela', quantity: 1, unit: Unit.PINCH },
        ]),
      ).toEqual([
        { ingredientId: 'ing_canela', quantity: 2, unit: Unit.PINCH },
        { ingredientId: 'ing_canela', quantity: 5, unit: Unit.MILLILITER },
      ]);
    });

    it('does not mix different ingredients', () => {
      expect(
        combineQuantities([
          { ingredientId: tomato, quantity: 1, unit: Unit.KILOGRAM },
          { ingredientId: 'ing_patata', quantity: 1, unit: Unit.KILOGRAM },
        ]),
      ).toEqual([
        { ingredientId: tomato, quantity: 1, unit: Unit.KILOGRAM },
        { ingredientId: 'ing_patata', quantity: 1, unit: Unit.KILOGRAM },
      ]);
    });

    it('rounds totals to three decimals', () => {
      expect(
        combineQuantities([
          { ingredientId: milk, quantity: 0.1, unit: Unit.LITER },
          { ingredientId: milk, quantity: 0.2, unit: Unit.LITER },
          { ingredientId: milk, quantity: 700.0004, unit: Unit.MILLILITER },
        ]),
      ).toEqual([{ ingredientId: milk, quantity: 1, unit: Unit.LITER }]);
    });

    it('returns nothing for no lines', () => {
      expect(combineQuantities([])).toEqual([]);
    });
  });
});
