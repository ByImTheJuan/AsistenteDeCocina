import { categoryLabel, searchIngredients } from './ingredients-api';

const tomate = {
  id: 'ing_tomate',
  name: 'Tomate',
  category: 'VEGETABLE',
  defaultUnit: 'PIECE' as const,
};
const pollo = { id: 'ing_pollo', name: 'Pollo', category: 'MEAT', defaultUnit: 'GRAM' as const };

describe('ingredients API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset();
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
    const algae = { id: 'ing_nori', name: 'Nori', category: 'ALGAE', defaultUnit: 'GRAM' as const };
    request.mockResolvedValue([algae]);

    await expect(searchIngredients(request, 'nori')).resolves.toEqual([algae]);
  });

  it('keeps only the fields it uses', async () => {
    request.mockResolvedValue([{ ...tomate, allergens: ['HISTAMINE'], allergensUncertain: false }]);

    await expect(searchIngredients(request, 'tomate')).resolves.toEqual([tomate]);
  });

  it('suggests pieces when the unit is one it does not know', async () => {
    request.mockResolvedValue([{ ...tomate, defaultUnit: 'CUP' as const }]);

    await expect(searchIngredients(request, 'tomate')).resolves.toEqual([tomate]);
  });

  it('rejects a response that is not a list of ingredients', async () => {
    request.mockResolvedValue([{ id: 'ing_tomate' }]);

    await expect(searchIngredients(request, 'tomate')).rejects.toThrow();
  });
});

describe('categoryLabel', () => {
  it('names the categories of the catalogue', () => {
    expect(categoryLabel('FISH_SEAFOOD')).toBe('Pescados y mariscos');
  });

  it('files an unknown category under the rest', () => {
    expect(categoryLabel('ALGAE')).toBe('Otros');
  });
});
