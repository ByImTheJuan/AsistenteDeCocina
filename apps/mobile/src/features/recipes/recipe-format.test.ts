import {
  describeAmount,
  describeConflicts,
  formatMinutes,
  formatRating,
  formatServings,
  hasConflicts,
  joinNames,
} from './recipe-format';

const sal = { id: 'ing_sal', name: 'Sal', category: 'OTHER', units: [], defaultUnit: 'GRAM' };
const ingredient = { id: 'ing_patata', name: 'Patata', category: 'VEGETABLE' };
const patata = { ...ingredient, units: ['PIECE' as const], defaultUnit: 'PIECE' as const };

describe('recipe format', () => {
  it('writes the time in minutes, then in hours', () => {
    expect(formatMinutes(10)).toBe('10 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(140)).toBe('2 h 20 min');
  });

  it('writes the servings', () => {
    expect(formatServings(1)).toBe('1 ración');
    expect(formatServings(4)).toBe('4 raciones');
  });

  it('says a recipe has no ratings instead of giving it a score', () => {
    expect(formatRating(null)).toBe('Sin valoraciones');
    expect(formatRating({ average: 0, count: 0 })).toBe('Sin valoraciones');
  });

  it('writes the rating with a decimal comma and how many there are', () => {
    expect(formatRating({ average: 4.46, count: 12 })).toBe('4,5 · 12 valoraciones');
    expect(formatRating({ average: 5, count: 1 })).toBe('5 · 1 valoración');
  });

  it('joins names as in a sentence', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['Patata'])).toBe('Patata');
    expect(joinNames(['Patata', 'Huevo'])).toBe('Patata y huevo');
    expect(joinNames(['Patata', 'Huevo', 'Cebolla'])).toBe('Patata, huevo y cebolla');
  });

  it('describes the amount of an ingredient, or that it goes to taste', () => {
    const line = { ingredient: patata, main: true };
    expect(describeAmount({ ...line, quantity: 4, unit: 'PIECE', note: 'medianas' })).toBe(
      '4 unidades, medianas',
    );
    expect(describeAmount({ ...line, quantity: 2, unit: 'TABLESPOON', note: null })).toBe(
      '2 cucharadas',
    );
    expect(describeAmount({ ...line, quantity: null, unit: null, note: null })).toBe('al gusto');
    expect(
      describeAmount({
        ingredient: { ...sal, units: ['GRAM'], defaultUnit: 'GRAM' },
        main: false,
        quantity: null,
        unit: null,
        note: 'al gusto',
      }),
    ).toBe('al gusto');
  });

  it('names the allergens and ingredients a recipe has of the restrictions', () => {
    const safety = {
      conflictingAllergens: ['EGG', 'MILK'],
      conflictingIngredients: [{ id: 'ing_patata', name: 'Patata' }],
      allergensUncertain: false,
    };

    expect(hasConflicts(safety)).toBe(true);
    expect(describeConflicts(safety)).toBe('huevo, leche y patata');
  });

  it('still names an allergen this version does not know', () => {
    const safety = {
      conflictingAllergens: ['NEW_ALLERGEN'],
      conflictingIngredients: [],
      allergensUncertain: false,
    };

    expect(describeConflicts(safety)).toBe('otro alérgeno');
  });

  it('finds no conflict when there is none', () => {
    expect(
      hasConflicts({ conflictingAllergens: [], conflictingIngredients: [], allergensUncertain: true }),
    ).toBe(false);
  });
});
