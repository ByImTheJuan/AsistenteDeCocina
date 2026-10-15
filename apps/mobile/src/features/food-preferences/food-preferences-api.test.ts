import { getFoodPreferences, saveFoodPreferences } from './food-preferences-api';

const tomate = {
  id: 'ing_tomate',
  name: 'Tomate',
  category: 'VEGETABLE',
  defaultUnit: 'PIECE' as const,
};
const pollo = { id: 'ing_pollo', name: 'Pollo', category: 'MEAT', defaultUnit: 'GRAM' as const };
const preferences = {
  diet: 'VEGETARIAN' as const,
  liked: [tomate],
  avoided: [pollo],
};

describe('food preferences API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset().mockResolvedValue(preferences);
  });

  it('reads the preferences', async () => {
    await expect(getFoodPreferences(request)).resolves.toEqual(preferences);

    expect(request).toHaveBeenCalledWith('/food-preferences');
  });

  it('reads the preferences of a user who has none', async () => {
    const empty = { diet: null, liked: [], avoided: [] };
    request.mockResolvedValue(empty);

    await expect(getFoodPreferences(request)).resolves.toEqual(empty);
  });

  it('saves the preferences sending only the ids of the ingredients', async () => {
    await expect(saveFoodPreferences(request, preferences)).resolves.toEqual(preferences);

    expect(request).toHaveBeenCalledWith('/food-preferences', {
      method: 'PUT',
      body: {
        diet: 'VEGETARIAN',
        likedIngredientIds: ['ing_tomate'],
        avoidedIngredientIds: ['ing_pollo'],
      },
    });
  });

  it.each([
    ['an unknown diet', { ...preferences, diet: 'CARNIVORE' }],
    ['a missing list', { diet: null, liked: [] }],
    ['an ingredient without a name', { ...preferences, liked: [{ id: 'ing_tomate' }] }],
    ['no body', undefined],
  ])('rejects a response with %s', async (_case, response) => {
    request.mockResolvedValue(response);

    await expect(getFoodPreferences(request)).rejects.toThrow();
  });
});
