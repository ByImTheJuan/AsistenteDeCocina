import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { Ingredient } from '../generated/prisma/client.js';
import { IngredientCategory } from '../generated/prisma/enums.js';

export class IngredientSearchQuery {
  @ApiPropertyOptional({
    description:
      'Text the name must contain. Case and accents are ignored. Without it, the catalogue is listed from the start.',
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

  static from(ingredient: Ingredient): IngredientResponse {
    return {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
    };
  }
}
