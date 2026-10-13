import {
  allergens,
  getDietaryRestrictions,
  saveDietaryRestrictions,
} from './dietary-restrictions-api';
import { dietaryRestrictionsErrorMessage } from './dietary-restrictions-errors';
import { allergenLabels, summarizeRestrictions } from './labels';

import { ApiError, NetworkError } from '@/lib/api-client';

const kiwi = { id: 'ing_kiwi', name: 'Kiwi', category: 'FRUIT' };
const leche = { id: 'ing_leche', name: 'Leche', category: 'DAIRY_EGG' };
const restrictions = {
  allergens: ['MILK' as const, 'LACTOSE' as const],
  ingredients: [kiwi],
  conflictingLikedIngredients: [leche],
};

describe('dietary restrictions API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset().mockResolvedValue(restrictions);
  });

  it('reads the restrictions', async () => {
    await expect(getDietaryRestrictions(request)).resolves.toEqual(restrictions);

    expect(request).toHaveBeenCalledWith('/dietary-restrictions');
  });

  it('reads the restrictions of a user who has none', async () => {
    const empty = { allergens: [], ingredients: [], conflictingLikedIngredients: [] };
    request.mockResolvedValue(empty);

    await expect(getDietaryRestrictions(request)).resolves.toEqual(empty);
  });

  it('saves the allergens and the ids of the ingredients, not the conflicts', async () => {
    await expect(saveDietaryRestrictions(request, restrictions)).resolves.toEqual(restrictions);

    expect(request).toHaveBeenCalledWith('/dietary-restrictions', {
      method: 'PUT',
      body: { allergens: ['MILK', 'LACTOSE'], ingredientIds: ['ing_kiwi'] },
    });
  });

  it.each([
    // Showing the rest and saving would silently delete the unknown one.
    ['an allergen it does not know', { ...restrictions, allergens: ['MILK', 'NEW_ALLERGEN'] }],
    ['a missing list', { allergens: [], ingredients: [] }],
    ['an ingredient without a name', { ...restrictions, ingredients: [{ id: 'ing_kiwi' }] }],
    ['no body', undefined],
  ])('rejects a response with %s', async (_case, response) => {
    request.mockResolvedValue(response);

    await expect(getDietaryRestrictions(request)).rejects.toThrow();
  });
});

describe('allergen labels', () => {
  it('names and explains every allergen', () => {
    expect(allergens).toHaveLength(18);
    for (const allergen of allergens) {
      expect(allergenLabels[allergen].name).not.toBe('');
      expect(allergenLabels[allergen].examples).not.toBe('');
    }
  });
});

describe('summarizeRestrictions', () => {
  it.each([
    [{ allergens: [], ingredients: [] }, 'Sin configurar'],
    [{ allergens: ['EGG' as const], ingredients: [] }, '1 restricción'],
    [{ allergens: [], ingredients: [kiwi] }, '1 restricción'],
    [{ allergens: ['EGG' as const, 'FISH' as const], ingredients: [kiwi] }, '3 restricciones'],
  ])('summarizes %j', (draft, summary) => {
    expect(summarizeRestrictions(draft)).toBe(summary);
  });
});

describe('dietaryRestrictionsErrorMessage', () => {
  it('explains an ingredient that is no longer in the catalogue', () => {
    expect(dietaryRestrictionsErrorMessage(new ApiError(400, 'unknown_ingredient'))).toContain(
      'ya no está disponible',
    );
  });

  it('explains a connection failure', () => {
    expect(dietaryRestrictionsErrorMessage(new NetworkError())).toContain(
      'No hemos podido conectar',
    );
  });

  it.each([new ApiError(500), new ApiError(400), new ApiError(400, 'something_new'), 'boom'])(
    'falls back to a generic message for %p',
    (error) => {
      expect(dietaryRestrictionsErrorMessage(error)).toContain('error inesperado');
    },
  );
});
