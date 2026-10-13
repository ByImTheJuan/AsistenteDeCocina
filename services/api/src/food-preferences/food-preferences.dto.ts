import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Diet } from '../generated/prisma/enums.js';
import { IngredientResponse } from '../ingredients/ingredients.dto.js';
import type { FoodPreferences } from './food-preferences.service.js';

export const MAX_INGREDIENTS_PER_LIST = 100;

export class SaveFoodPreferencesRequest {
  // Required but nullable: null means no dietary preference.
  @ApiProperty({ enum: Diet, enumName: 'Diet', nullable: true })
  @ValidateIf((body: SaveFoodPreferencesRequest) => body.diet !== null)
  @IsEnum(Diet)
  diet: Diet | null;

  @ApiProperty({ type: [String], maxItems: MAX_INGREDIENTS_PER_LIST })
  @IsArray()
  @ArrayMaxSize(MAX_INGREDIENTS_PER_LIST)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(191, { each: true })
  likedIngredientIds: string[];

  @ApiProperty({ type: [String], maxItems: MAX_INGREDIENTS_PER_LIST })
  @IsArray()
  @ArrayMaxSize(MAX_INGREDIENTS_PER_LIST)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(191, { each: true })
  avoidedIngredientIds: string[];
}

export class FoodPreferencesResponse {
  @ApiProperty({
    enum: Diet,
    enumName: 'Diet',
    nullable: true,
    description: 'Null when the user has not chosen a diet',
  })
  diet: Diet | null;

  @ApiProperty({ type: [IngredientResponse] })
  liked: IngredientResponse[];

  @ApiProperty({ type: [IngredientResponse] })
  avoided: IngredientResponse[];

  static from(preferences: FoodPreferences): FoodPreferencesResponse {
    return {
      diet: preferences.diet,
      liked: preferences.liked.map((item) => IngredientResponse.from(item)),
      avoided: preferences.avoided.map((item) => IngredientResponse.from(item)),
    };
  }
}
