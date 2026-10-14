import { z } from 'zod';

import {
  nutritionGoalFields,
  type NutritionGoalField,
  type NutritionGoals,
} from './nutrition-goals-api';

/** How each goal is presented and the values it admits. The API checks the same ranges. */
export const goalSettings: Record<
  NutritionGoalField,
  { title: string; description: string; unit: string; min: number; max: number }
> = {
  dailyCalories: {
    title: 'Calorías al día',
    description: 'El total que quieres tomar en un día.',
    unit: 'kcal',
    min: 500,
    max: 10_000,
  },
  mealCalories: {
    title: 'Calorías por comida',
    description: 'Lo que quieres que aporte, como mucho, cada comida.',
    unit: 'kcal',
    min: 50,
    max: 5_000,
  },
  dailyProtein: {
    title: 'Proteínas al día',
    description: 'Los gramos de proteínas que quieres alcanzar en un día.',
    unit: 'g',
    min: 1,
    max: 500,
  },
};

// Thousands with a dot, as in Spanish. Written by hand: not every JavaScript
// engine the app runs on groups four-digit numbers.
const formatNumber = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, '.');

// The field holds what the user typed; an empty one means the goal is not set.
function goalFormSchema(field: NutritionGoalField) {
  const { min, max, unit } = goalSettings[field];
  return z.object({
    value: z
      .string()
      .trim()
      .refine(
        (text) => text === '' || /^\d+$/.test(text),
        'Escribe un número entero, sin decimales.',
      )
      .refine(
        (text) => !/^\d+$/.test(text) || (Number(text) >= min && Number(text) <= max),
        `Debe estar entre ${formatNumber(min)} y ${formatNumber(max)} ${unit}.`,
      ),
    enabled: z.boolean(),
  });
}

const mealAboveDailyMessage = 'No puede superar tus calorías al día.';

export const nutritionGoalsFormSchema = z
  .object({
    dailyCalories: goalFormSchema('dailyCalories'),
    mealCalories: goalFormSchema('mealCalories'),
    dailyProtein: goalFormSchema('dailyProtein'),
  })
  .superRefine(({ dailyCalories, mealCalories }, context) => {
    // Only goals in use are compared, as the API does.
    const inUse = (goal: { value: string; enabled: boolean }) =>
      goal.enabled && /^\d+$/.test(goal.value);
    if (
      inUse(dailyCalories) &&
      inUse(mealCalories) &&
      Number(mealCalories.value) > Number(dailyCalories.value)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['mealCalories', 'value'],
        message: mealAboveDailyMessage,
      });
    }
  });

export type NutritionGoalsForm = z.infer<typeof nutritionGoalsFormSchema>;

// A goal that is not set starts with its switch on, so it applies as soon as
// it gets a value.
export function toForm(goals: NutritionGoals): NutritionGoalsForm {
  const field = (goal: NutritionGoals[NutritionGoalField]) =>
    goal ? { value: String(goal.value), enabled: goal.enabled } : { value: '', enabled: true };
  return {
    dailyCalories: field(goals.dailyCalories),
    mealCalories: field(goals.mealCalories),
    dailyProtein: field(goals.dailyProtein),
  };
}

/** For a form that has passed validation. */
export function toGoals(form: NutritionGoalsForm): NutritionGoals {
  const goal = ({ value, enabled }: NutritionGoalsForm[NutritionGoalField]) =>
    value.trim() === '' ? null : { value: Number(value), enabled };
  return {
    dailyCalories: goal(form.dailyCalories),
    mealCalories: goal(form.mealCalories),
    dailyProtein: goal(form.dailyProtein),
  };
}

/** How many goals are in use, in words. */
export function summarizeGoals(goals: NutritionGoals): string {
  const set = nutritionGoalFields.map((field) => goals[field]).filter((goal) => goal !== null);
  const active = set.filter((goal) => goal.enabled).length;
  if (set.length === 0) {
    return 'Sin configurar';
  }
  if (active === 0) {
    return 'Ninguno activo';
  }
  return active === 1 ? '1 objetivo activo' : `${active} objetivos activos`;
}
