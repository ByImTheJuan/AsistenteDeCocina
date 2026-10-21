import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

// Stable identifiers the app maps to messages. The 400 ones share the status
// with the validation errors, so the status alone would not tell them apart.
export type MealPlanErrorCode =
  | 'invalid_range'
  | 'unknown_recipe'
  | 'meal_slot_taken'
  | 'recipe_not_allowed'
  | 'meal_plan_entry_not_found';

export function mealPlanBadRequest(
  code: Extract<MealPlanErrorCode, 'invalid_range' | 'unknown_recipe'>,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    code,
    message,
  });
}

export function mealPlanConflict(
  code: Extract<MealPlanErrorCode, 'meal_slot_taken' | 'recipe_not_allowed'>,
  message: string,
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code,
    message,
  });
}

// Also for another user's entry: whether it exists is not theirs to know.
export function mealPlanEntryNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    code: 'meal_plan_entry_not_found' satisfies MealPlanErrorCode,
    message: 'The meal plan has no such entry',
  });
}
