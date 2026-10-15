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
