import { BadRequestException } from '@nestjs/common';

// Stable identifiers the app maps to messages; both share the 400 status with
// the validation errors.
export type FoodPreferencesErrorCode =
  'ingredient_in_both_lists' | 'unknown_ingredient';

export function foodPreferencesError(
  code: FoodPreferencesErrorCode,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    code,
    message,
  });
}
