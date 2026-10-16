import type { Allergen } from '../generated/prisma/client.js';
import type { IngredientWithAllergens } from '../ingredients/ingredient-with-allergens.js';
import { hasConflicts, recipeSafety } from './recipe-safety.js';

function ingredient(
  id: string,
  allergens: Allergen[] = [],
  allergensUncertain = false,
): IngredientWithAllergens {
  return {
    id,
    name: id,
    category: 'OTHER',
    origin: 'PLANT',
    allergensUncertain,
    measure: 'WEIGHT',
    defaultUnit: 'GRAM',
    createdAt: new Date(0),
    kcalPer100g: null,
    proteinPer100g: null,
    gramsPerPiece: null,
    gramsPerMilliliter: null,
    allergens: allergens.map((allergen) => ({ ingredientId: id, allergen })),
  };
}

const huevo = ingredient('ing_huevo', ['EGG']);
const harina = ingredient('ing_harina_de_trigo', ['GLUTEN']);
const queso = ingredient('ing_queso', ['MILK', 'LACTOSE', 'HISTAMINE']);
const patata = ingredient('ing_patata');
const pan = ingredient('ing_pan', ['GLUTEN'], true);

const none = { allergens: [], ingredients: [] };

describe('recipeSafety', () => {
  it('finds no conflict for a user without restrictions', () => {
    const safety = recipeSafety([huevo, harina, patata], none);

    expect(safety).toEqual({
      conflictingAllergens: [],
      conflictingIngredients: [],
      allergensUncertain: false,
    });
    expect(hasConflicts(safety)).toBe(false);
  });

  it('finds the restricted allergens some ingredient contains, in enum order', () => {
    const safety = recipeSafety([queso, huevo, patata], {
      allergens: ['MILK', 'GLUTEN', 'EGG'],
      ingredients: [],
    });

    expect(safety.conflictingAllergens).toEqual(['EGG', 'MILK']);
    expect(hasConflicts(safety)).toBe(true);
  });

  it('finds the ingredients restricted by name, once each', () => {
    const safety = recipeSafety([patata, huevo, patata], {
      allergens: [],
      ingredients: [{ id: 'ing_patata' }],
    });

    expect(safety.conflictingIngredients).toEqual([patata]);
    expect(safety.conflictingAllergens).toEqual([]);
    expect(hasConflicts(safety)).toBe(true);
  });

  it('marks as uncertain a recipe with a processed food, without making it a conflict', () => {
    const safety = recipeSafety([pan, patata], none);

    expect(safety.allergensUncertain).toBe(true);
    expect(hasConflicts(safety)).toBe(false);
  });

  it('still reports the known allergens of an uncertain ingredient', () => {
    const safety = recipeSafety([pan], {
      allergens: ['GLUTEN'],
      ingredients: [],
    });

    expect(safety.conflictingAllergens).toEqual(['GLUTEN']);
    expect(safety.allergensUncertain).toBe(true);
  });
});
