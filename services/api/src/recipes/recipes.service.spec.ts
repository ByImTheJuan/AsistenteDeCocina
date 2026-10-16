import { NotFoundException } from '@nestjs/common';
import type { DietaryRestrictionsService } from '../dietary-restrictions/dietary-restrictions.service.js';
import type { FoodPreferencesService } from '../food-preferences/food-preferences.service.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import type { NutritionGoalsService } from '../nutrition-goals/nutrition-goals.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { RecipesService } from './recipes.service.js';

// The catalogue is exercised against MySQL in test/recipes.e2e-spec.ts. These
// tests pin down the filtering with a catalogue made up for them.
describe('RecipesService', () => {
  const recipe = { findMany: vi.fn(), findUnique: vi.fn() };
  const restrictions = { get: vi.fn() };
  const goals = { get: vi.fn() };
  const inventory = { list: vi.fn() };
  const preferences = { get: vi.fn() };
  const current = { id: 'user-1', sessionId: null };

  // Goes to taste unless a test gives it a quantity.
  const line = (id: string, allergens: string[] = []) => ({
    main: true,
    quantity: null,
    unit: null,
    ingredient: {
      id,
      name: id,
      origin: 'PLANT',
      allergensUncertain: false,
      allergens: allergens.map((allergen) => ({ allergen })),
      aliases: [],
      kcalPer100g: null,
      proteinPer100g: null,
      gramsPerPiece: null,
      gramsPerMilliliter: null,
    },
  });

  let service: RecipesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecipesService(
      { recipe } as unknown as PrismaService,
      restrictions as unknown as DietaryRestrictionsService,
      goals as unknown as NutritionGoalsService,
      inventory as unknown as InventoryService,
      preferences as unknown as FoodPreferencesService,
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

  it('matches the apt recipes against the pantry of the user', async () => {
    restrictions.get.mockResolvedValue({
      allergens: ['FISH'],
      ingredients: [],
    });
    inventory.list.mockResolvedValue([
      {
        ingredientId: 'ing_arroz',
        quantity: null,
        unit: null,
        expiresOn: null,
        dateKind: null,
      },
    ]);
    const weighed = (id: string, allergens: string[] = []) => ({
      ...line(id, allergens),
      quantity: { toNumber: () => 100 },
      unit: 'GRAM',
    });
    recipe.findMany.mockResolvedValue([
      { id: 'a', ingredients: [weighed('ing_arroz')] },
      { id: 'b', ingredients: [weighed('ing_merluza', ['FISH'])] },
      { id: 'c', ingredients: [weighed('ing_patata')] },
    ]);

    const result = await service.pantry(current, '2026-10-16');

    expect(inventory.list).toHaveBeenCalledWith(current);
    expect(result.hiddenCount).toBe(1);
    expect(result.inventoryEmpty).toBe(false);
    expect(
      result.recipes.map(({ id, pantry }) => [id, pantry.canPrepare]),
    ).toEqual([
      ['a', true],
      ['c', false],
    ]);
  });

  it('says when the pantry is empty', async () => {
    restrictions.get.mockResolvedValue({ allergens: [], ingredients: [] });
    inventory.list.mockResolvedValue([]);
    recipe.findMany.mockResolvedValue([]);

    const result = await service.pantry(current, '2026-10-16');

    expect(result.inventoryEmpty).toBe(true);
  });

  it('recommends the apt recipes that fit the tastes, the most suitable first', async () => {
    restrictions.get.mockResolvedValue({
      allergens: ['FISH'],
      ingredients: [],
    });
    preferences.get.mockResolvedValue({
      diet: 'VEGETARIAN',
      liked: [{ id: 'ing_tomate' }],
      avoided: [{ id: 'ing_cebolla' }],
    });
    goals.get.mockResolvedValue({
      dailyCalories: null,
      mealCalories: null,
      dailyProtein: null,
    });
    inventory.list.mockResolvedValue([]);
    const food = (id: string, origin = 'PLANT', allergens: string[] = []) => {
      const base = line(id, allergens);
      return {
        ...base,
        quantity: null,
        unit: null,
        ingredient: {
          ...base.ingredient,
          origin,
          kcalPer100g: null,
          proteinPer100g: null,
          gramsPerPiece: null,
          gramsPerMilliliter: null,
        },
      };
    };
    recipe.findMany.mockResolvedValue([
      {
        id: 'arroz',
        name: 'Arroz',
        servings: 2,
        ingredients: [food('ing_arroz')],
      },
      {
        id: 'merluza',
        name: 'Merluza',
        servings: 2,
        ingredients: [food('ing_merluza', 'FISH', ['FISH'])],
      },
      {
        id: 'pollo',
        name: 'Pollo',
        servings: 2,
        ingredients: [food('ing_pollo', 'MEAT')],
      },
      {
        id: 'sopa',
        name: 'Sopa',
        servings: 2,
        ingredients: [food('ing_cebolla')],
      },
      {
        id: 'tomate',
        name: 'Tomate',
        servings: 2,
        ingredients: [food('ing_tomate')],
      },
    ]);

    const result = await service.recommendations(current, '2026-10-16');

    expect(preferences.get).toHaveBeenCalledWith(current);
    expect(result.recipes.map(({ id }) => id)).toEqual(['tomate', 'arroz']);
    expect(result.recipes[0].likedIngredients.map(({ id }) => id)).toEqual([
      'ing_tomate',
    ]);
    expect(result.hiddenCount).toBe(1);
    expect(result.excludedCount).toBe(2);
  });

  it('answers not found for an unknown recipe', async () => {
    restrictions.get.mockResolvedValue({ allergens: [], ingredients: [] });
    recipe.findUnique.mockResolvedValue(null);

    await expect(service.detail(current, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
