import { NotFoundException } from '@nestjs/common';

// Stable identifiers the app maps to messages.
export type RecipesErrorCode = 'recipe_not_found';

export function recipeNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    code: 'recipe_not_found' satisfies RecipesErrorCode,
    message: 'The catalogue has no such recipe',
  });
}
