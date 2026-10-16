import type { Unit } from '../generated/prisma/client.js';
import { recipeNutrition, type NutritionLine } from './recipe-nutrition.js';

const n = (value: number) => ({ toNumber: () => value });

type Food = {
  kcal?: number | null;
  protein?: number | null;
  piece?: number | null;
  density?: number | null;
};

function line(
  id: string,
  quantity: number | null,
  unit: Unit | null,
  { kcal = 100, protein = 10, piece = null, density = null }: Food = {},
): NutritionLine {
  return {
    quantity: quantity === null ? null : n(quantity),
    unit,
    ingredient: {
      id,
      name: id,
      kcalPer100g: kcal === null ? null : n(kcal),
      proteinPer100g: protein === null ? null : n(protein),
      gramsPerPiece: piece === null ? null : n(piece),
      gramsPerMilliliter: density === null ? null : n(density),
    },
  };
}

describe('recipeNutrition', () => {
  it('adds up weighed ingredients and divides by the servings', () => {
    const nutrition = recipeNutrition(
      [
        line('arroz', 300, 'GRAM', { kcal: 360, protein: 7 }),
        line('pollo', 1, 'KILOGRAM', { kcal: 180, protein: 19 }),
      ],
      4,
    );

    // (1080 + 1800) / 4 kcal and (21 + 190) / 4 g.
    expect(nutrition.perServing).toEqual({ calories: 720, protein: 52.8 });
    expect(nutrition.missingIngredients).toEqual([]);
    expect(nutrition.excludesToTaste).toBe(false);
  });

  it('weighs volumes and spoons with the density', () => {
    const nutrition = recipeNutrition(
      [
        line('aceite', 100, 'MILLILITER', {
          kcal: 884,
          protein: 0,
          density: 0.92,
        }),
        line('harina', 2, 'TABLESPOON', {
          kcal: 364,
          protein: 10,
          density: 0.5,
        }),
        line('leche', 0.5, 'LITER', { kcal: 64, protein: 3.3, density: 1 }),
        line('canela', 1, 'TEASPOON', { kcal: 247, protein: 4, density: 0.6 }),
      ],
      1,
    );

    // 92 g of oil, 15 g of flour, 500 g of milk and 3 g of cinnamon.
    expect(nutrition.perServing).toEqual({ calories: 1195, protein: 18.1 });
  });

  it('weighs counted foods with the weight of a piece', () => {
    const nutrition = recipeNutrition(
      [line('huevo', 2, 'PIECE', { kcal: 143, protein: 12.6, piece: 55 })],
      1,
    );

    expect(nutrition.perServing).toEqual({ calories: 157, protein: 13.9 });
  });

  it('counts nothing for a pinch or an ingredient to taste, and says so', () => {
    const nutrition = recipeNutrition(
      [
        line('arroz', 100, 'GRAM', { kcal: 360, protein: 7 }),
        line('azafran', 1, 'PINCH', { kcal: null, protein: null }),
        line('sal', null, null, { kcal: null, protein: null }),
      ],
      1,
    );

    expect(nutrition.perServing).toEqual({ calories: 360, protein: 7 });
    expect(nutrition.missingIngredients).toEqual([]);
    expect(nutrition.excludesToTaste).toBe(true);
  });

  it('gives no total when an ingredient lacks the equivalence its unit needs', () => {
    const nutrition = recipeNutrition(
      [
        line('arroz', 100, 'GRAM'),
        line('cebolla', 1, 'PIECE'),
        line('aceite', 1, 'TABLESPOON'),
      ],
      2,
    );

    expect(nutrition.perServing).toEqual({ calories: null, protein: null });
    expect(nutrition.missingIngredients).toEqual([
      { id: 'cebolla', name: 'cebolla' },
      { id: 'aceite', name: 'aceite' },
    ]);
  });

  it('leaves out only the nutrient an ingredient lacks, and reports it once', () => {
    const nutrition = recipeNutrition(
      [
        line('arroz', 100, 'GRAM', { kcal: 360, protein: 7 }),
        line('raro', 50, 'GRAM', { kcal: null, protein: 4 }),
        line('raro', 50, 'GRAM', { kcal: null, protein: 4 }),
      ],
      1,
    );

    expect(nutrition.perServing).toEqual({ calories: null, protein: 11 });
    expect(nutrition.missingIngredients).toEqual([
      { id: 'raro', name: 'raro' },
    ]);
  });
});
