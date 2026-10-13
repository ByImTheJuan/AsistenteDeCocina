import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Allergen } from '../generated/prisma/enums.js';
import {
  IngredientResponse,
  sortAllergens,
} from '../ingredients/ingredients.dto.js';
import type { DietaryRestrictions } from './dietary-restrictions.service.js';

export const MAX_RESTRICTED_INGREDIENTS = 100;

export class SaveDietaryRestrictionsRequest {
  @ApiProperty({ enum: Allergen, enumName: 'Allergen', isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(Allergen, { each: true })
  allergens: Allergen[];

  @ApiProperty({
    type: [String],
    maxItems: MAX_RESTRICTED_INGREDIENTS,
    description: 'Ingredients of the catalogue to avoid on their own',
  })
  @IsArray()
  @ArrayMaxSize(MAX_RESTRICTED_INGREDIENTS)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(191, { each: true })
  ingredientIds: string[];
}

export class DietaryRestrictionsResponse {
  @ApiProperty({ enum: Allergen, enumName: 'Allergen', isArray: true })
  allergens: Allergen[];

  @ApiProperty({ type: [IngredientResponse] })
  ingredients: IngredientResponse[];

  @ApiProperty({
    type: [IngredientResponse],
    description:
      'Ingredients the user marked as liked that these restrictions forbid. They stay liked; the restriction takes precedence.',
  })
  conflictingLikedIngredients: IngredientResponse[];

  static from(restrictions: DietaryRestrictions): DietaryRestrictionsResponse {
    const toResponse = (
      ingredient: DietaryRestrictions['ingredients'][number],
    ) => IngredientResponse.from(ingredient);
    return {
      allergens: sortAllergens(restrictions.allergens),
      ingredients: restrictions.ingredients.map(toResponse),
      conflictingLikedIngredients:
        restrictions.conflictingLikedIngredients.map(toResponse),
    };
  }
}
