import { NotFoundException } from '@nestjs/common';
import type { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { NutritionGoalsService } from '../nutrition-goals/nutrition-goals.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { RecipesService } from './recipes.service.js';

// The catalogue is exercised against MySQL in test/recipes.e2e-spec.ts. These
// tests pin down the filtering with a catalogue made up for them.
describe('RecipesService', () => {
  const recipe = { findMany: vi.fn(), findUnique: vi.fn() };
  const restrictions = { get: vi.fn() };
  const goals = { get: vi.fn() };
  const current = { id: 'user-1', sessionId: null };

  const line = (id: string, allergens: string[] = []) => ({
    main: true,
    ingredient: {
      id,
      name: id,
      allergensUncertain: false,
      allergens: allergens.map((allergen) => ({ allergen })),
    },
  });

  let service: RecipesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecipesService(
      { recipe } as unknown as PrismaService,
      restrictions as unknown as DietaryRestrictionsService,
      goals as unknown as NutritionGoalsService,
    );
  });

  it('keeps out the recipes that clash with the restrictions and counts them', async () => {
    restrictions.get.mockResolvedValue({
      allergens: ['FISH'],
      ingredients: [{ id: 'ing_patata' }],
    });
    recipe.findMany.mockResolvedValue([
      { id: 'a', ingredients: [line('ing_arroz')] },
      { id: 'b', ingredients: [line('ing_merluza', ['FISH'])] },
      { id: 'c', ingredients: [line('ing_patata')] },
    ]);

    const catalogue = await service.catalogue(current);

    expect(catalogue.recipes.map(({ id }) => id)).toEqual(['a']);
    expect(catalogue.hiddenCount).toBe(2);
  });

  it('reads the restrictions of the user before answering', async () => {
    restrictions.get.mockRejectedValue(new Error('no account'));

    await expect(service.catalogue(current)).rejects.toThrow('no account');
    expect(restrictions.get).toHaveBeenCalledWith(current);
  });

  it('answers not found for an unknown recipe', async () => {
    restrictions.get.mockResolvedValue({ allergens: [], ingredients: [] });
    recipe.findUnique.mockResolvedValue(null);

    await expect(service.detail(current, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
