import { getRecipe, getRecipeCatalogue } from './recipes-api';

const summary = {
  id: 'rec_tortilla_patatas',
  name: 'Tortilla de patatas',
  imageUrl: null,
  totalMinutes: 45,
  mainIngredients: [{ id: 'ing_patata', name: 'Patata' }],
  allergensUncertain: false,
  rating: null,
};

const detail = {
  ...summary,
  description: 'La de siempre.',
  servings: 4,
  ingredients: [
    {
      ingredient: {
        id: 'ing_patata',
        name: 'Patata',
        category: 'VEGETABLE',
        allergens: [],
        allergensUncertain: false,
        units: ['PIECE', 'GRAM', 'KILOGRAM'],
        defaultUnit: 'PIECE',
      },
      quantity: 4,
      unit: 'PIECE',
      note: 'medianas',
      main: true,
    },
  ],
  steps: ['Pela las patatas.'],
  safety: { conflictingAllergens: ['EGG'], conflictingIngredients: [], allergensUncertain: false },
  nutrition: {
    perServing: { calories: 678, protein: 14.4 },
    estimated: true,
    missingIngredients: [],
    excludesToTaste: true,
  },
  goals: [
    { kind: 'DAILY_CALORIES', target: 2000, comparable: true, percent: 34, withinGoal: null },
    { kind: 'NEW_GOAL', target: 30, comparable: true, percent: 10, withinGoal: null },
  ],
};

describe('recipes API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset();
  });

  it('reads the catalogue and how many recipes were hidden', async () => {
    request.mockResolvedValue({ recipes: [summary], hiddenCount: 2 });

    await expect(getRecipeCatalogue(request)).resolves.toEqual({
      recipes: [summary],
      hiddenCount: 2,
    });
    expect(request).toHaveBeenCalledWith('/recipes');
  });

  it('reads a recipe, escaping its id', async () => {
    request.mockResolvedValue(detail);

    const recipe = await getRecipe(request, 'rec/1');

    expect(request).toHaveBeenCalledWith('/recipes/rec%2F1');
    expect(recipe.ingredients[0]).toMatchObject({ quantity: 4, unit: 'PIECE', note: 'medianas' });
    expect(recipe.safety.conflictingAllergens).toEqual(['EGG']);
    expect(recipe.nutrition.perServing).toEqual({ calories: 678, protein: 14.4 });
  });

  it('leaves out the goals this version does not know', async () => {
    request.mockResolvedValue(detail);

    const recipe = await getRecipe(request, 'rec_tortilla_patatas');

    expect(recipe.goals.map(({ kind }) => kind)).toEqual(['DAILY_CALORIES']);
  });

  it('keeps a rating when there is one', async () => {
    request.mockResolvedValue({
      recipes: [{ ...summary, rating: { average: 4.5, count: 3 } }],
      hiddenCount: 0,
    });

    const { recipes } = await getRecipeCatalogue(request);

    expect(recipes[0].rating).toEqual({ average: 4.5, count: 3 });
  });

  it('rejects a response that is not a catalogue', async () => {
    request.mockResolvedValue({ recipes: [{ id: 'x' }] });

    await expect(getRecipeCatalogue(request)).rejects.toThrow();
  });
});
