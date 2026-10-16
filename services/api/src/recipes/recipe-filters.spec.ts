import type { FoodOrigin } from '../generated/prisma/client.js';
import {
  type FilterableRecipe,
  matchesFilters,
  matchesSearch,
  normalize,
  sortRecipes,
} from './recipe-filters.js';

const food = (
  name: string,
  origin: FoodOrigin = 'PLANT',
  aliases: string[] = [],
) => ({
  ingredient: { name, origin, aliases: aliases.map((alias) => ({ alias })) },
});

function recipe(
  name: string,
  overrides: Partial<FilterableRecipe> = {},
): FilterableRecipe {
  return {
    name,
    totalMinutes: 30,
    caloriesPerServing: 400,
    ingredients: [],
    ...overrides,
  };
}

const tortilla = recipe('Tortilla de patatas', {
  totalMinutes: 45,
  caloriesPerServing: 678,
  ingredients: [
    food('Patata', 'PLANT', ['papa']),
    food('Huevo', 'ANIMAL_PRODUCT'),
  ],
});
const salmon = recipe('Salmón a la plancha con espárragos', {
  totalMinutes: 20,
  caloriesPerServing: 420,
  ingredients: [food('Salmón', 'FISH'), food('Espárrago')],
});
const hummus = recipe('Hummus', {
  totalMinutes: 15,
  caloriesPerServing: null,
  ingredients: [food('Garbanzo'), food('Tahini')],
});

describe('normalize', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(normalize('  Salmón PLANCHA ')).toBe('salmon plancha');
  });
});

describe('matchesSearch', () => {
  it('finds a recipe by its name, without minding case or accents', () => {
    expect(matchesSearch(salmon, 'SALMON')).toBe(true);
    expect(matchesSearch(salmon, 'espárr')).toBe(true);
  });

  it('finds a recipe by an ingredient or a synonym of it', () => {
    expect(matchesSearch(hummus, 'garbanzo')).toBe(true);
    expect(matchesSearch(tortilla, 'papa')).toBe(true);
  });

  it('needs every word to appear somewhere', () => {
    expect(matchesSearch(tortilla, 'patata huevo')).toBe(true);
    expect(matchesSearch(tortilla, 'patata salmón')).toBe(false);
  });

  it('lets everything through with an empty search', () => {
    expect(matchesSearch(tortilla, '   ')).toBe(true);
    expect(matchesSearch(tortilla, undefined)).toBe(true);
  });
});

describe('matchesFilters', () => {
  const pass = (filters: Parameters<typeof matchesFilters>[1]) =>
    [tortilla, salmon, hummus]
      .filter((one) => matchesFilters(one, filters))
      .map(({ name }) => name);

  it('lets everything through without filters', () => {
    expect(pass({})).toHaveLength(3);
  });

  it('keeps the recipes within the time', () => {
    expect(pass({ maxMinutes: 20 })).toEqual([salmon.name, hummus.name]);
  });

  it('keeps the recipes within the calories and leaves out the unknown ones', () => {
    expect(pass({ maxCalories: 500 })).toEqual([salmon.name]);
  });

  it('keeps the recipes the diet allows', () => {
    expect(pass({ diet: 'VEGETARIAN' })).toEqual([tortilla.name, hummus.name]);
    expect(pass({ diet: 'VEGAN' })).toEqual([hummus.name]);
    expect(pass({ diet: 'PESCATARIAN' })).toHaveLength(3);
  });

  it('combines the search and the filters', () => {
    expect(
      pass({ diet: 'PESCATARIAN', maxMinutes: 30, search: 'plancha' }),
    ).toEqual([salmon.name]);
  });
});

describe('sortRecipes', () => {
  // The list arrives by name, which breaks ties.
  const byName = [hummus, salmon, tortilla];
  const names = (list: FilterableRecipe[]) => list.map(({ name }) => name);

  it('keeps the order by name by default', () => {
    expect(names(sortRecipes(byName))).toEqual(names(byName));
    expect(names(sortRecipes(byName, 'NAME'))).toEqual(names(byName));
  });

  it('puts the quickest first', () => {
    expect(names(sortRecipes(byName, 'TIME'))).toEqual([
      hummus.name,
      salmon.name,
      tortilla.name,
    ]);
  });

  it('puts the lightest first and the unknown calories last', () => {
    expect(names(sortRecipes(byName, 'CALORIES'))).toEqual([
      salmon.name,
      tortilla.name,
      hummus.name,
    ]);
  });

  it('breaks ties by the order it was given', () => {
    const a = recipe('A', { totalMinutes: 10 });
    const b = recipe('B', { totalMinutes: 10 });

    expect(names(sortRecipes([a, b], 'TIME'))).toEqual(['A', 'B']);
  });
});
