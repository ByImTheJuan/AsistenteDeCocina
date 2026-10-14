import { apiErrorMessage } from '@/lib/api-error-message';

const messagesByCode: Record<string, string> = {
  meal_calories_exceed_daily: 'Las calorías por comida no pueden superar las calorías al día.',
};

/** Message to show when a nutrition goals request fails. */
export function nutritionGoalsErrorMessage(error: unknown): string {
  return apiErrorMessage(error, messagesByCode);
}
