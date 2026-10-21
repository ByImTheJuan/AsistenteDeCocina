import {
  addMealPlanEntry,
  getMealPlan,
  removeMealPlanEntry,
  updateMealPlanEntry,
} from './meal-plan-api';

const entry = {
  id: 'entry-1',
  date: '2026-10-20',
  meal: 'LUNCH',
  recipe: {
    id: 'rec_tortilla_patatas',
    name: 'Tortilla de patatas',
    imageUrl: null,
    totalMinutes: 45,
    mainIngredients: [{ id: 'ing_patata', name: 'Patata' }],
    allergensUncertain: false,
    rating: null,
    caloriesPerServing: 320,
  },
  recipeConflicts: false,
};
const input = { date: '2026-10-20', meal: 'LUNCH' as const, recipeId: 'rec_tortilla_patatas' };

describe('meal plan API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset();
  });

  it('reads the plan of some days', async () => {
    request.mockResolvedValue({ entries: [entry] });

    await expect(getMealPlan(request, '2026-10-19', '2026-10-25')).resolves.toEqual({
      entries: [entry],
    });
    expect(request).toHaveBeenCalledWith('/meal-plan?from=2026-10-19&to=2026-10-25');
  });

  it('rejects an answer that is not a plan', async () => {
    request.mockResolvedValue({ entries: [{ ...entry, meal: 'SNACK' }] });

    await expect(getMealPlan(request, '2026-10-19', '2026-10-25')).rejects.toThrow();
  });

  it('plans a recipe', async () => {
    request.mockResolvedValue(entry);

    await expect(addMealPlanEntry(request, input)).resolves.toEqual(entry);
    expect(request).toHaveBeenCalledWith('/meal-plan', { method: 'POST', body: input });
  });

  it('changes an entry', async () => {
    request.mockResolvedValue(entry);

    await expect(updateMealPlanEntry(request, 'entry/1', input)).resolves.toEqual(entry);
    expect(request).toHaveBeenCalledWith('/meal-plan/entry%2F1', { method: 'PUT', body: input });
  });

  it('removes an entry', async () => {
    request.mockResolvedValue(undefined);

    await removeMealPlanEntry(request, 'entry-1');

    expect(request).toHaveBeenCalledWith('/meal-plan/entry-1', { method: 'DELETE' });
  });
});
