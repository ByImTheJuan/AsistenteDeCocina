import type { MealPlanEntry } from './meal-plan-api';

import type { RecipeSummary } from '@/features/recipes/recipes-api';

// Data and a clock shared by the meal plan screen tests.

/** Wednesday 21 October 2026; its week goes from the 19th to the 25th. */
export const NOW = new Date(2026, 9, 21, 10);
export const THIS_WEEK = 'GET /meal-plan?from=2026-10-19&to=2026-10-25';
export const NEXT_WEEK = 'GET /meal-plan?from=2026-10-26&to=2026-11-01';

/** Only the date is faked: the day the screens take as today. */
export function fakeToday() {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

const summary = (recipe: Partial<RecipeSummary> & Pick<RecipeSummary, 'id' | 'name'>) => ({
  imageUrl: null,
  totalMinutes: 30,
  mainIngredients: [],
  allergensUncertain: false,
  rating: null,
  caloriesPerServing: null,
  ...recipe,
});

export const tortilla = summary({
  id: 'rec_tortilla_patatas',
  name: 'Tortilla de patatas',
  totalMinutes: 45,
  mainIngredients: [
    { id: 'ing_patata', name: 'Patata' },
    { id: 'ing_huevo', name: 'Huevo' },
  ],
  caloriesPerServing: 320,
});
export const gazpacho = summary({
  id: 'rec_gazpacho',
  name: 'Gazpacho andaluz',
  totalMinutes: 20,
  allergensUncertain: true,
});
export const pisto = summary({ id: 'rec_pisto', name: 'Pisto de verduras', totalMinutes: 50 });

export const tuesdayLunch: MealPlanEntry = {
  id: 'entry-1',
  date: '2026-10-20',
  meal: 'LUNCH',
  recipe: tortilla,
  recipeConflicts: false,
};
export const wednesdayDinner: MealPlanEntry = {
  id: 'entry-2',
  date: '2026-10-21',
  meal: 'DINNER',
  recipe: gazpacho,
  recipeConflicts: false,
};
