import { getNutritionGoals, saveNutritionGoals } from './nutrition-goals-api';
import { nutritionGoalsErrorMessage } from './nutrition-goals-errors';
import {
  nutritionGoalsFormSchema,
  summarizeGoals,
  toForm,
  toGoals,
  type NutritionGoalsForm,
} from './nutrition-goals-form';

import { ApiError, NetworkError } from '@/lib/api-client';

const none = { dailyCalories: null, mealCalories: null, dailyProtein: null };
const on = (value: number) => ({ value, enabled: true });
const off = (value: number) => ({ value, enabled: false });

const blank = { value: '', enabled: true };
const emptyForm: NutritionGoalsForm = {
  dailyCalories: blank,
  mealCalories: blank,
  dailyProtein: blank,
};
const typed = (value: string, enabled = true) => ({ value, enabled });

describe('nutrition goals API', () => {
  const request = jest.fn();
  const goals = { dailyCalories: on(2000), mealCalories: null, dailyProtein: off(90) };

  beforeEach(() => {
    request.mockReset().mockResolvedValue(goals);
  });

  it('reads the goals', async () => {
    await expect(getNutritionGoals(request)).resolves.toEqual(goals);

    expect(request).toHaveBeenCalledWith('/nutrition-goals');
  });

  it('reads the goals of a user who has none', async () => {
    request.mockResolvedValue(none);

    await expect(getNutritionGoals(request)).resolves.toEqual(none);
  });

  it('saves the three goals, the unset ones as null', async () => {
    await expect(saveNutritionGoals(request, goals)).resolves.toEqual(goals);

    expect(request).toHaveBeenCalledWith('/nutrition-goals', { method: 'PUT', body: goals });
  });

  it.each([
    ['a goal left out', { dailyCalories: null, mealCalories: null }],
    ['a value that is not a number', { ...none, dailyCalories: { value: '2000', enabled: true } }],
    ['a goal without its switch', { ...none, dailyCalories: { value: 2000 } }],
    ['no body', undefined],
  ])('rejects a response with %s', async (_case, response) => {
    request.mockResolvedValue(response);

    await expect(getNutritionGoals(request)).rejects.toThrow();
  });
});

describe('nutrition goals form', () => {
  const errorsOf = (form: NutritionGoalsForm) => {
    const result = nutritionGoalsFormSchema.safeParse(form);
    return result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  };

  it('accepts a form without any goal', () => {
    expect(errorsOf(emptyForm)).toEqual([]);
  });

  it('accepts whole numbers within the range of each goal', () => {
    expect(
      errorsOf({
        dailyCalories: typed('2000'),
        mealCalories: typed('650'),
        dailyProtein: typed('90'),
      }),
    ).toEqual([]);
    expect(
      errorsOf({
        dailyCalories: typed('500'),
        mealCalories: typed('50'),
        dailyProtein: typed('1'),
      }),
    ).toEqual([]);
    expect(
      errorsOf({
        dailyCalories: typed('10000'),
        mealCalories: typed('5000'),
        dailyProtein: typed('500'),
      }),
    ).toEqual([]);
  });

  it.each(['90,5', '90.5', '-90', 'mucho', '9 0'])('rejects "%s" as a value', (value) => {
    expect(errorsOf({ ...emptyForm, dailyProtein: typed(value) })).toEqual([
      'dailyProtein.value: Escribe un número entero, sin decimales.',
    ]);
  });

  it.each([
    ['dailyCalories', '499', 'Debe estar entre 500 y 10.000 kcal.'],
    ['dailyCalories', '10001', 'Debe estar entre 500 y 10.000 kcal.'],
    ['mealCalories', '49', 'Debe estar entre 50 y 5.000 kcal.'],
    ['mealCalories', '5001', 'Debe estar entre 50 y 5.000 kcal.'],
    ['dailyProtein', '0', 'Debe estar entre 1 y 500 g.'],
    ['dailyProtein', '501', 'Debe estar entre 1 y 500 g.'],
  ] as const)('rejects %s of %s', (field, value, message) => {
    expect(errorsOf({ ...emptyForm, [field]: typed(value) })).toEqual([
      `${field}.value: ${message}`,
    ]);
  });

  it('checks the range of a goal that is switched off too, since its value is kept', () => {
    expect(errorsOf({ ...emptyForm, dailyProtein: typed('900', false) })).toEqual([
      'dailyProtein.value: Debe estar entre 1 y 500 g.',
    ]);
  });

  it('rejects more calories per meal than per day', () => {
    expect(
      errorsOf({ ...emptyForm, dailyCalories: typed('1500'), mealCalories: typed('1600') }),
    ).toEqual(['mealCalories.value: No puede superar tus calorías al día.']);
  });

  it('accepts as many calories per meal as per day', () => {
    expect(
      errorsOf({ ...emptyForm, dailyCalories: typed('1500'), mealCalories: typed('1500') }),
    ).toEqual([]);
  });

  it.each([
    [{ dailyCalories: typed('1500', false), mealCalories: typed('1600') }],
    [{ dailyCalories: typed('1500'), mealCalories: typed('1600', false) }],
  ])('does not compare the calorie goals while one is switched off', (goals) => {
    expect(errorsOf({ ...emptyForm, ...goals })).toEqual([]);
  });

  it('turns the saved goals into what the fields show', () => {
    expect(toForm({ dailyCalories: on(2000), mealCalories: null, dailyProtein: off(90) })).toEqual({
      dailyCalories: typed('2000'),
      mealCalories: blank,
      dailyProtein: typed('90', false),
    });
  });

  it('turns the fields into goals, leaving out the empty ones', () => {
    expect(
      toGoals({
        dailyCalories: typed(' 2000 '),
        mealCalories: typed('   ', false),
        dailyProtein: typed('90', false),
      }),
    ).toEqual({ dailyCalories: on(2000), mealCalories: null, dailyProtein: off(90) });
  });
});

describe('summarizeGoals', () => {
  it.each([
    [none, 'Sin configurar'],
    [{ ...none, dailyCalories: on(2000) }, '1 objetivo activo'],
    [
      { dailyCalories: on(2000), mealCalories: on(600), dailyProtein: on(90) },
      '3 objetivos activos',
    ],
    [{ dailyCalories: on(2000), mealCalories: off(600), dailyProtein: null }, '1 objetivo activo'],
    [{ ...none, dailyProtein: off(90) }, 'Ninguno activo'],
  ])('summarizes %j', (goals, summary) => {
    expect(summarizeGoals(goals)).toBe(summary);
  });
});

describe('nutritionGoalsErrorMessage', () => {
  it('explains calories per meal above the daily ones', () => {
    expect(nutritionGoalsErrorMessage(new ApiError(400, 'meal_calories_exceed_daily'))).toContain(
      'no pueden superar las calorías al día',
    );
  });

  it('explains a connection failure', () => {
    expect(nutritionGoalsErrorMessage(new NetworkError())).toContain('No hemos podido conectar');
  });

  it.each([new ApiError(500), new ApiError(400), 'boom'])(
    'falls back to a generic message for %p',
    (error) => {
      expect(nutritionGoalsErrorMessage(error)).toContain('error inesperado');
    },
  );
});
