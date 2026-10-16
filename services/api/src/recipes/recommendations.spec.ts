import type { Diet, FoodOrigin } from '../generated/prisma/client.js';
import type { GoalFit } from './nutrition-goals-fit.js';
import type { PantryMatch } from './pantry-match.js';
import {
  dietAllows,
  isRecommendable,
  likedIngredients,
  recommendationScore,
  SCORE,
  type ScoreInput,
  type Tastes,
} from './recommendations.js';

const TODAY = '2026-10-16';

const food = (id: string, origin: FoodOrigin = 'PLANT') => ({
  id,
  name: id,
  origin,
});

const noTastes: Tastes = { diet: null, liked: [], avoided: [] };

const emptyPantry: PantryMatch = {
  canPrepare: false,
  missing: [],
  checkQuantity: [],
  checkToTaste: [],
  using: [],
};

const missing = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ingredient: { id: `m${index}`, name: `m${index}` },
    needed: { quantity: 1, unit: 'PIECE' as const },
    have: null,
    expired: false,
  }));

const used = (expiresOn: string | null = null) => ({
  ingredient: { id: 'u', name: 'u' },
  expiresOn,
  dateKind: expiresOn === null ? null : ('USE_BY' as const),
});

const mealGoal = (withinGoal: boolean | null): GoalFit => ({
  kind: 'MEAL_CALORIES',
  target: 600,
  comparable: withinGoal !== null,
  percent: null,
  withinGoal,
});

const score = (input: Partial<ScoreInput>) =>
  recommendationScore(
    {
      likedCount: 0,
      pantry: emptyPantry,
      goals: [],
      allergensUncertain: false,
      ...input,
    },
    TODAY,
  );

describe('dietAllows', () => {
  const everything: FoodOrigin[] = ['PLANT', 'ANIMAL_PRODUCT', 'FISH', 'MEAT'];
  const allowed = (diet: Diet | null) =>
    everything.filter((origin) => dietAllows(diet, [origin]));

  it('allows only plants on a vegan diet', () => {
    expect(allowed('VEGAN')).toEqual(['PLANT']);
  });

  it('allows eggs, dairy and honey but no fish or meat on a vegetarian diet', () => {
    expect(allowed('VEGETARIAN')).toEqual(['PLANT', 'ANIMAL_PRODUCT']);
  });

  it('allows fish but no meat on a pescatarian diet', () => {
    expect(allowed('PESCATARIAN')).toEqual(['PLANT', 'ANIMAL_PRODUCT', 'FISH']);
  });

  it('allows everything on a flexitarian diet or with no diet', () => {
    expect(allowed('FLEXITARIAN')).toEqual(everything);
    expect(allowed(null)).toEqual(everything);
  });

  it('needs every ingredient to be allowed', () => {
    expect(dietAllows('VEGETARIAN', ['PLANT', 'MEAT'])).toBe(false);
  });
});

describe('isRecommendable', () => {
  it('leaves out a recipe the diet does not allow', () => {
    const recipe = [food('arroz'), food('pollo', 'MEAT')];

    expect(isRecommendable(recipe, { ...noTastes, diet: 'VEGETARIAN' })).toBe(
      false,
    );
    expect(isRecommendable(recipe, noTastes)).toBe(true);
  });

  it('leaves out a recipe with a food the user does not like', () => {
    const recipe = [food('arroz'), food('cebolla')];

    expect(
      isRecommendable(recipe, { ...noTastes, avoided: [{ id: 'cebolla' }] }),
    ).toBe(false);
  });
});

describe('likedIngredients', () => {
  it('lists the liked ingredients once each, in recipe order', () => {
    const recipe = [food('tomate'), food('ajo'), food('tomate'), food('pan')];

    expect(
      likedIngredients(recipe, {
        ...noTastes,
        liked: [{ id: 'pan' }, { id: 'tomate' }],
      }).map(({ id }) => id),
    ).toEqual(['tomate', 'pan']);
  });
});

describe('recommendationScore', () => {
  it('is zero with nothing to say about the recipe', () => {
    expect(score({})).toBe(0);
  });

  it('adds points for each liked ingredient, up to three', () => {
    expect(score({ likedCount: 2 })).toBe(2 * SCORE.liked);
    expect(score({ likedCount: 5 })).toBe(3 * SCORE.liked);
  });

  it('adds points when the pantry has everything', () => {
    expect(score({ pantry: { ...emptyPantry, canPrepare: true } })).toBe(
      SCORE.canPrepare,
    );
  });

  it('adds fewer points when it uses the pantry and misses up to three', () => {
    expect(
      score({
        pantry: { ...emptyPantry, missing: missing(3), using: [used()] },
      }),
    ).toBe(SCORE.almostReady);
    expect(
      score({
        pantry: { ...emptyPantry, missing: missing(4), using: [used()] },
      }),
    ).toBe(0);
    expect(score({ pantry: { ...emptyPantry, missing: missing(1) } })).toBe(0);
  });

  it('adds points when it uses something that expires within three days', () => {
    const using = (on: string) => ({
      ...emptyPantry,
      canPrepare: true,
      using: [used(on)],
    });

    expect(score({ pantry: using('2026-10-19') })).toBe(
      SCORE.canPrepare + SCORE.usesExpiringSoon,
    );
    expect(score({ pantry: using('2026-10-20') })).toBe(SCORE.canPrepare);
  });

  it('moves a recipe up within the goal per meal and down over it', () => {
    expect(score({ goals: [mealGoal(true)] })).toBe(SCORE.withinMealGoal);
    expect(score({ goals: [mealGoal(false)] })).toBe(SCORE.overMealGoal);
    expect(score({ goals: [mealGoal(null)] })).toBe(0);
  });

  it('moves down a recipe whose allergens cannot be verified', () => {
    expect(score({ allergensUncertain: true })).toBe(SCORE.allergensUncertain);
  });
});
