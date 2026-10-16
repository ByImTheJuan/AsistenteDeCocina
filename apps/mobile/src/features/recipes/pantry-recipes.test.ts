import { describePantry, describeSoonest, groupPantryRecipes } from './pantry-recipes';
import type { PantryRecipe, RecipePantry } from './recipes-api';

const ON = '2026-10-16';

const food = (name: string) => ({ id: `ing_${name.toLowerCase()}`, name });

const empty: RecipePantry = {
  canPrepare: true,
  missing: [],
  checkQuantity: [],
  checkToTaste: [],
  using: [],
};

function recipe(name: string, pantry: Partial<RecipePantry>): PantryRecipe {
  return {
    id: `rec_${name.toLowerCase()}`,
    name,
    imageUrl: null,
    totalMinutes: 30,
    mainIngredients: [],
    allergensUncertain: false,
    rating: null,
    caloriesPerServing: null,
    pantry: { ...empty, ...pantry },
  };
}

const using = (name: string, expiresOn: string | null = null) => ({
  ingredient: food(name),
  expiresOn,
  dateKind: expiresOn ? ('USE_BY' as const) : null,
});

const missing = (name: string) => ({
  ingredient: food(name),
  needed: { quantity: 100, unit: 'GRAM' as const },
  have: null,
  expired: false,
});

const names = (recipes: PantryRecipe[]) => recipes.map(({ name }) => name);

describe('groupPantryRecipes', () => {
  it('puts first the recipes that use up what expires soon, the nearest date first', () => {
    const groups = groupPantryRecipes(
      [
        recipe('Crema', { using: [using('Calabacín', '2026-10-18')] }),
        recipe('Pollo', {
          canPrepare: false,
          missing: [missing('Limón')],
          using: [using('Pollo', '2026-10-17'), using('Ajo', '2026-12-01')],
        }),
        recipe('Arroz', { using: [using('Arroz', '2026-12-01')] }),
      ],
      ON,
    );

    expect(groups.expiring.map(({ recipe: { name } }) => name)).toEqual(['Pollo', 'Crema']);
    expect(groups.expiring[0].soonest.ingredient.name).toBe('Pollo');
    expect(names(groups.ready)).toEqual(['Arroz']);
  });

  it('keeps the recipes that can be prepared in the order of the API', () => {
    const groups = groupPantryRecipes(
      [recipe('Arroz', { using: [using('Arroz')] }), recipe('Ensalada', {})],
      ON,
    );

    expect(names(groups.ready)).toEqual(['Arroz', 'Ensalada']);
  });

  it('orders the rest by what is missing and then by what they use from home', () => {
    const groups = groupPantryRecipes(
      [
        recipe('Dos', {
          canPrepare: false,
          missing: [missing('A'), missing('B')],
          using: [using('C')],
        }),
        recipe('Una', { canPrepare: false, missing: [missing('A')], using: [using('C')] }),
        recipe('Una con más', {
          canPrepare: false,
          missing: [missing('A')],
          using: [using('C'), using('D')],
        }),
      ],
      ON,
    );

    expect(names(groups.almost)).toEqual(['Una con más', 'Una', 'Dos']);
  });

  it('leaves out recipes that miss too much or use nothing from home', () => {
    const groups = groupPantryRecipes(
      [
        recipe('Cuatro', {
          canPrepare: false,
          missing: ['A', 'B', 'C', 'D'].map(missing),
          using: [using('E', '2026-10-17')],
        }),
        recipe('Nada', { canPrepare: false, missing: [missing('A')] }),
      ],
      ON,
    );

    expect(groups).toEqual({ expiring: [], ready: [], almost: [] });
  });
});

describe('describeSoonest', () => {
  it('says what the recipe uses up and when it expires', () => {
    expect(describeSoonest(using('Calabacín', '2026-10-17'), ON)).toBe(
      'Usa Calabacín · Caduca mañana',
    );
  });
});

describe('describePantry', () => {
  it('says nothing when the recipe has everything', () => {
    expect(describePantry(empty)).toEqual([]);
  });

  it('lists what is missing, how much there is and what has expired', () => {
    expect(
      describePantry({
        ...empty,
        canPrepare: false,
        missing: [
          missing('Chorizo'),
          {
            ingredient: food('Patata'),
            needed: { quantity: 600, unit: 'GRAM' },
            have: { quantity: 200, unit: 'GRAM' },
            expired: false,
          },
          { ...missing('Pollo'), expired: true },
        ],
      }),
    ).toEqual([
      { text: 'Falta: Chorizo y patata (tienes 200 g de 600 g)' },
      { text: 'Caducado, no se cuenta: Pollo', danger: true },
    ]);
  });

  it('asks to check quantities and what goes to taste', () => {
    expect(
      describePantry({
        ...empty,
        checkQuantity: [food('Patata')],
        checkToTaste: [food('Sal'), food('Pimienta')],
      }),
    ).toEqual([
      { text: 'Comprueba la cantidad de: Patata' },
      { text: 'Comprueba que tienes: Sal y pimienta' },
    ]);
  });
});
