import { activeFilterCount, describeFilters, noFilters, toQuery } from './recipe-filters';

const some = {
  maxMinutes: 30,
  maxCalories: 500,
  diet: 'VEGETARIAN' as const,
  sort: 'CALORIES' as const,
};

describe('recipe filters', () => {
  it('counts the filters in use, the order only when it is not by name', () => {
    expect(activeFilterCount(noFilters)).toBe(0);
    expect(activeFilterCount({ ...noFilters, diet: 'VEGAN' })).toBe(1);
    expect(activeFilterCount(some)).toBe(4);
  });

  it('sums up the filters in use', () => {
    expect(describeFilters(some)).toBe('Hasta 30 min · Hasta 500 kcal · Vegetariana · Menos calorías');
    expect(describeFilters({ ...noFilters, sort: 'TIME' })).toBe('Menos tiempo');
    expect(describeFilters(noFilters)).toBe('');
  });

  it('asks the API for nothing more without a search or filters', () => {
    expect(toQuery('   ', noFilters)).toBe('');
  });

  it('sends only what is set, with the search escaped', () => {
    expect(toQuery(' patata & huevo ', { ...noFilters, maxMinutes: 15 })).toBe(
      'search=patata%20%26%20huevo&maxMinutes=15',
    );
    expect(toQuery('', some)).toBe('maxMinutes=30&maxCalories=500&diet=VEGETARIAN&sort=CALORIES');
  });
});
