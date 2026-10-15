import type { Unit } from '../generated/prisma/client.js';
import { UNITS } from '../units/units.js';

// Prisma decimals, or anything else that turns into a number.
type Numeric = { toNumber(): number };

export type NutritionLine = {
  quantity: Numeric | null;
  unit: Unit | null;
  ingredient: {
    id: string;
    name: string;
    kcalPer100g: Numeric | null;
    proteinPer100g: Numeric | null;
    gramsPerPiece: Numeric | null;
    gramsPerMilliliter: Numeric | null;
  };
};

export type Nutrients = {
  /** Kilocalories; null when some ingredient lacks the data to work it out. */
  calories: number | null;
  /** Grams of protein; null when some ingredient lacks the data. */
  protein: number | null;
};

export type RecipeNutrition = {
  perServing: Nutrients;
  /** Ingredients with a quantity whose data is missing, once each. */
  missingIngredients: { id: string; name: string }[];
  /** Some ingredient goes to taste and is not counted. */
  excludesToTaste: boolean;
};

const NEGLIGIBLE = 'negligible';

/**
 * Grams of the ingredient in a line, `negligible` for a pinch, or null when
 * the food lacks the equivalence its unit needs. These equivalences only
 * estimate nutrition: quantities are never compared across kinds of unit
 * (docs/decisions/0005-unidades-y-equivalencias.md).
 */
function gramsOf(
  quantity: number,
  unit: Unit,
  ingredient: NutritionLine['ingredient'],
): number | null | typeof NEGLIGIBLE {
  const { kind, factor } = UNITS[unit];
  switch (kind) {
    case 'MASS':
      return quantity * factor;
    case 'VOLUME':
      return ingredient.gramsPerMilliliter === null
        ? null
        : quantity * factor * ingredient.gramsPerMilliliter.toNumber();
    case 'COUNT':
      return ingredient.gramsPerPiece === null
        ? null
        : quantity * ingredient.gramsPerPiece.toNumber();
    case 'PINCH':
      return NEGLIGIBLE;
  }
}

/**
 * Estimated calories and protein of one serving, from average values of the
 * ingredients. A total is never given when some ingredient that counts lacks
 * its data: that nutrient is null and the ingredient is reported instead.
 */
export function recipeNutrition(
  lines: NutritionLine[],
  servings: number,
): RecipeNutrition {
  let calories: number | null = 0;
  let protein: number | null = 0;
  const missing = new Map<string, { id: string; name: string }>();
  const reportMissing = ({ id, name }: NutritionLine['ingredient']) =>
    missing.set(id, { id, name });

  for (const { quantity, unit, ingredient } of lines) {
    if (quantity === null || unit === null) {
      continue;
    }
    const grams = gramsOf(quantity.toNumber(), unit, ingredient);
    if (grams === NEGLIGIBLE) {
      continue;
    }
    if (grams === null) {
      calories = null;
      protein = null;
      reportMissing(ingredient);
      continue;
    }
    if (ingredient.kcalPer100g === null) {
      calories = null;
      reportMissing(ingredient);
    } else if (calories !== null) {
      calories += (grams * ingredient.kcalPer100g.toNumber()) / 100;
    }
    if (ingredient.proteinPer100g === null) {
      protein = null;
      reportMissing(ingredient);
    } else if (protein !== null) {
      protein += (grams * ingredient.proteinPer100g.toNumber()) / 100;
    }
  }

  return {
    perServing: {
      calories: calories === null ? null : Math.round(calories / servings),
      protein:
        protein === null ? null : Math.round((protein / servings) * 10) / 10,
    },
    missingIngredients: [...missing.values()],
    excludesToTaste: lines.some(
      ({ quantity, unit }) => quantity === null || unit === null,
    ),
  };
}
