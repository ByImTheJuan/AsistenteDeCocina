import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Allergen,
  IngredientCategory,
  Unit,
} from '../generated/prisma/enums.js';
import type { IngredientWithAllergens } from './ingredient-with-allergens.js';

const allergenOrder = Object.values(Allergen);

/** Allergens in the order of the enum, whatever order they were given in. */
export function sortAllergens(allergens: Allergen[]): Allergen[] {
  return allergenOrder.filter((allergen) => allergens.includes(allergen));
}

export class IngredientSearchQuery {
  @ApiPropertyOptional({
    description:
      'Text the name or one of its synonyms must contain. Case and accents are ignored. Without it, the catalogue is listed from the start.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class IngredientResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Tomate' })
  name: string;

  @ApiProperty({ enum: IngredientCategory, enumName: 'IngredientCategory' })
  category: IngredientCategory;

  @ApiProperty({
    enum: Allergen,
    enumName: 'Allergen',
    isArray: true,
    description:
      'Allergens and intolerance triggers the ingredient is known to contain. An empty list is not a guarantee against traces.',
  })
  allergens: Allergen[];

  @ApiProperty({
    description:
      'True for processed foods whose composition depends on the brand: they may contain allergens that are not listed.',
  })
  allergensUncertain: boolean;

  @ApiProperty({
    enum: Unit,
    enumName: 'Unit',
    description:
      'Unit the food is usually measured in. A suggestion for the user, not a restriction.',
  })
  defaultUnit: Unit;

  static from(ingredient: IngredientWithAllergens): IngredientResponse {
    return {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      allergens: sortAllergens(
        ingredient.allergens.map(({ allergen }) => allergen),
      ),
      allergensUncertain: ingredient.allergensUncertain,
      defaultUnit: ingredient.defaultUnit,
    };
  }
}
