import { getFoodPreferences, saveFoodPreferences, searchIngredients } from './food-preferences-api';

const tomate = { id: 'ing_tomate', name: 'Tomate', category: 'VEGETABLE' };
const pollo = { id: 'ing_pollo', name: 'Pollo', category: 'MEAT' };
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

  it('searches the ingredients by text', async () => {
    request.mockResolvedValue([tomate]);

    await expect(searchIngredients(request, ' piña & coco ')).resolves.toEqual([tomate]);

    expect(request).toHaveBeenCalledWith('/ingredients?search=pi%C3%B1a%20%26%20coco');
  });

  it('lists the start of the catalogue without a text', async () => {
    request.mockResolvedValue([tomate, pollo]);

    await expect(searchIngredients(request, '  ')).resolves.toEqual([tomate, pollo]);

    expect(request).toHaveBeenCalledWith('/ingredients');
  });

  it('accepts ingredients of a category it does not know', async () => {
    const algae = { id: 'ing_nori', name: 'Nori', category: 'ALGAE' };
    request.mockResolvedValue([algae]);

    await expect(searchIngredients(request, 'nori')).resolves.toEqual([algae]);
  });
});
