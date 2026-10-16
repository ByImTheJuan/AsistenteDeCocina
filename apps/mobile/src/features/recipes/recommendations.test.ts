import type { GoalFit, RecommendedRecipe } from './recipes-api';
import { describeLeftOut, describeRecommendation } from './recommendations';

const ON = '2026-10-16';

const food = (id: string, name: string) => ({ id, name });

function recipe(overrides: Partial<RecommendedRecipe> = {}): RecommendedRecipe {
  return {
    id: 'rec_tortilla_patatas',
    name: 'Tortilla de patatas',
    imageUrl: null,
    totalMinutes: 45,
    mainIngredients: [],
    allergensUncertain: false,
    rating: null,
    description: 'La de siempre.',
    servings: 4,
    likedIngredients: [],
    pantry: { canPrepare: false, missing: [], checkQuantity: [], checkToTaste: [], using: [] },
    perServing: { calories: 520, protein: 14 },
    goals: [],
    ...overrides,
  };
}

const goal = (fit: Partial<GoalFit> & Pick<GoalFit, 'kind'>): GoalFit => ({
  target: 600,
  comparable: true,
  percent: null,
  withinGoal: null,
  ...fit,
});

const missing = (name: string) => ({
  ingredient: food(`ing_${name}`, name),
  needed: { quantity: 1, unit: 'PIECE' as const },
  have: null,
  expired: false,
});

const texts = (lines: { text: string }[]) => lines.map(({ text }) => text);

describe('describeRecommendation', () => {
  it('gives the calories of a serving when there is nothing else to say', () => {
    expect(describeRecommendation(recipe(), ON)).toEqual([{ text: '520 kcal por ración' }]);
  });

  it('says which liked ingredients it has', () => {
    expect(
      texts(describeRecommendation(recipe({ likedIngredients: [food('ing_huevo', 'Huevo')] }), ON)),
    ).toContain('Lleva huevo, que te gusta');
    expect(
      texts(
        describeRecommendation(
          recipe({
            likedIngredients: [food('ing_patata', 'Patata'), food('ing_huevo', 'Huevo')],
          }),
          ON,
        ),
      ),
    ).toContain('Lleva patata y huevo, que te gustan');
  });

  it('says when it can be prepared with what there is at home', () => {
    const lines = describeRecommendation(
      recipe({ pantry: { ...recipe().pantry, canPrepare: true } }),
      ON,
    );

    expect(texts(lines)).toContain('Puedes prepararla con lo que tienes en casa');
  });

  it('says what is missing only when it uses the pantry and little is missing', () => {
    const using = [{ ingredient: food('ing_patata', 'Patata'), expiresOn: null, dateKind: null }];
    const almost = recipe({
      pantry: { ...recipe().pantry, missing: [missing('Chorizo'), missing('Pimiento')], using },
    });
    const far = recipe({
      pantry: {
        ...recipe().pantry,
        missing: ['A', 'B', 'C', 'D'].map(missing),
        using,
      },
    });

    expect(texts(describeRecommendation(almost, ON))).toContain('Te falta: chorizo y pimiento');
    expect(texts(describeRecommendation(far, ON))).toEqual(['520 kcal por ración']);
  });

  it('warns about what it uses up that expires soon', () => {
    const lines = describeRecommendation(
      recipe({
        pantry: {
          ...recipe().pantry,
          canPrepare: true,
          using: [
            { ingredient: food('ing_tomate', 'Tomate'), expiresOn: '2026-10-17', dateKind: 'USE_BY' },
          ],
        },
      }),
      ON,
    );

    expect(lines).toContainEqual({ text: 'Usa Tomate · Caduca mañana', warning: true });
  });

  it('compares a serving with the calorie goals', () => {
    const within = recipe({
      goals: [
        goal({ kind: 'DAILY_CALORIES', target: 2000, percent: 26 }),
        goal({ kind: 'MEAL_CALORIES', withinGoal: true }),
      ],
    });
    const over = recipe({ goals: [goal({ kind: 'MEAL_CALORIES', withinGoal: false })] });

    expect(describeRecommendation(within, ON)).toEqual([
      {
        text: '520 kcal por ración · 26 % de tus calorías diarias · Dentro de tu objetivo por comida',
      },
    ]);
    expect(describeRecommendation(over, ON)).toEqual([
      { text: '520 kcal por ración · Supera tu objetivo por comida', warning: true },
    ]);
  });

  it('says so when the calories cannot be worked out', () => {
    const lines = describeRecommendation(
      recipe({
        perServing: { calories: null, protein: null },
        goals: [goal({ kind: 'MEAL_CALORIES', comparable: false })],
      }),
      ON,
    );

    expect(lines).toEqual([{ text: 'Sin datos suficientes para calcular las calorías' }]);
  });

  it('never presents as safe a recipe whose allergens cannot be verified', () => {
    expect(describeRecommendation(recipe({ allergensUncertain: true }), ON)[0]).toEqual({
      text: 'Revisa los alérgenos',
      warning: true,
    });
  });
});

describe('describeLeftOut', () => {
  it('says why recipes were left out', () => {
    expect(describeLeftOut(1, 0)).toBe(
      'No te proponemos 1 receta por tus alergias e intolerancias.',
    );
    expect(describeLeftOut(3, 5)).toBe(
      'No te proponemos 3 recetas por tus alergias e intolerancias ni 5 recetas por tu dieta o los alimentos que no te gustan.',
    );
  });

  it('says nothing when none was', () => {
    expect(describeLeftOut(0, 0)).toBeNull();
  });
});
