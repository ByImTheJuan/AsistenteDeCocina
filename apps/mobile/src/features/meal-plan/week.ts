import { z } from 'zod';

import { formatDay, fromCalendarDay, toCalendarDay } from '@/features/inventory/expiry';

// The meals of a day a recipe can be planned for, in the order of the day.
export const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
export const mealTypeSchema = z.enum(mealTypes);
export type MealType = z.infer<typeof mealTypeSchema>;

export const mealLabels: Record<MealType, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Comida',
  DINNER: 'Cena',
};

// A week goes from Monday to Sunday.
const weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** The calendar day `days` after `day` (before it when negative). */
export function addDays(day: string, days: number): string {
  const date = fromCalendarDay(day);
  date.setDate(date.getDate() + days);
  return toCalendarDay(date);
}

/** 0 for Monday to 6 for Sunday. */
function weekdayIndex(day: string): number {
  return (fromCalendarDay(day).getDay() + 6) % 7;
}

/** The Monday of the week of `day`. */
export function weekStart(day: string): string {
  return addDays(day, -weekdayIndex(day));
}

/** The seven days of the week that starts on `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** "Lunes 20 oct", with the year when it is not the year of `on`. */
export function formatWeekday(day: string, on: string): string {
  return `${weekdayNames[weekdayIndex(day)]} ${formatDay(day, on)}`;
}

/** "19–25 oct", "27 oct – 2 nov", with the year when it is not that of `on`. */
export function formatWeek(start: string, on: string): string {
  const end = addDays(start, 6);
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${Number(start.slice(8))}–${formatDay(end, on)}`;
  }
  return `${formatDay(start, on)} – ${formatDay(end, on)}`;
}
