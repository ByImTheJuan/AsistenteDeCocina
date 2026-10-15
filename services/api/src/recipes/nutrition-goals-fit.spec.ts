import { nutritionGoalsFit } from './nutrition-goals-fit.js';

const noGoals = { dailyCalories: null, mealCalories: null, dailyProtein: null };
const allGoals = {
  dailyCalories: { value: 2000, enabled: true },
  mealCalories: { value: 600, enabled: true },
  dailyProtein: { value: 120, enabled: true },
};

describe('nutritionGoalsFit', () => {
  it('compares nothing without goals', () => {
    expect(nutritionGoalsFit({ calories: 500, protein: 20 }, noGoals)).toEqual(
      [],
    );
  });

  it('gives the share of the daily goals and whether a serving fits a meal', () => {
    expect(
      nutritionGoalsFit({ calories: 640, protein: 28.8 }, allGoals),
    ).toEqual([
      {
        kind: 'DAILY_CALORIES',
        target: 2000,
        comparable: true,
        percent: 32,
        withinGoal: null,
      },
      {
        kind: 'MEAL_CALORIES',
        target: 600,
        comparable: true,
        percent: null,
        withinGoal: false,
      },
      {
        kind: 'DAILY_PROTEIN',
        target: 120,
        comparable: true,
        percent: 24,
        withinGoal: null,
      },
    ]);
  });

  it('counts a serving equal to the goal per meal as within it', () => {
    const [fit] = nutritionGoalsFit(
      { calories: 600, protein: 10 },
      { ...noGoals, mealCalories: { value: 600, enabled: true } },
    );

    expect(fit.withinGoal).toBe(true);
  });

  it('leaves out the goals that are switched off', () => {
    const fits = nutritionGoalsFit(
      { calories: 500, protein: 20 },
      {
        ...allGoals,
        dailyCalories: { value: 2000, enabled: false },
        dailyProtein: { value: 120, enabled: false },
      },
    );

    expect(fits.map(({ kind }) => kind)).toEqual(['MEAL_CALORIES']);
  });

  it('says a goal cannot be compared when the recipe lacks the data', () => {
    const fits = nutritionGoalsFit({ calories: null, protein: 20 }, allGoals);

    expect(fits).toEqual([
      expect.objectContaining({
        kind: 'DAILY_CALORIES',
        comparable: false,
        percent: null,
      }),
      expect.objectContaining({
        kind: 'MEAL_CALORIES',
        comparable: false,
        withinGoal: null,
      }),
      expect.objectContaining({
        kind: 'DAILY_PROTEIN',
        comparable: true,
        percent: 17,
      }),
    ]);
  });
});
