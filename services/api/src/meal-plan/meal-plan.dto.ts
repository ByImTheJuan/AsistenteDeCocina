import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Validate,
} from 'class-validator';
import { MealType } from '../generated/prisma/enums.js';
import { DATE_RANGE, DateInRange } from '../inventory/inventory.dto.js';
import { hasConflicts } from '../recipes/recipe-safety.js';
import { RecipeSummaryResponse } from '../recipes/recipes.dto.js';
import type { MealPlanEntry, MealPlanEntryInput } from './meal-plan.service.js';
import { MAX_PLAN_DAYS } from './meal-plan.service.js';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dayDescription = `Calendar day (YYYY-MM-DD), from ${DATE_RANGE.min} to ${DATE_RANGE.max}.`;

const mealProperty = {
  enum: MealType,
  enumName: 'MealType',
  description: 'The meal of the day: breakfast, lunch or dinner.',
};

/** The days the plan is read for, both included. */
export class MealPlanQuery {
  @ApiProperty({
    example: '2026-10-19',
    description: `First day. ${dayDescription}`,
  })
  @Matches(DAY_PATTERN, { message: 'from must be YYYY-MM-DD' })
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(DateInRange)
  from: string;

  @ApiProperty({
    example: '2026-10-25',
    description: `Last day, at most ${MAX_PLAN_DAYS} days after the first counting both. ${dayDescription}`,
  })
  @Matches(DAY_PATTERN, { message: 'to must be YYYY-MM-DD' })
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(DateInRange)
  to: string;
}

// Every field is required: an entry is a recipe for a meal of a day.
export class MealPlanEntryRequest implements MealPlanEntryInput {
  @ApiProperty({
    example: '2026-10-20',
    format: 'date',
    description: dayDescription,
  })
  @Matches(DAY_PATTERN, { message: 'date must be YYYY-MM-DD' })
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(DateInRange)
  date: string;

  @ApiProperty(mealProperty)
  @IsEnum(MealType)
  meal: MealType;

  @ApiProperty({ example: 'rec_tortilla_patatas', maxLength: 191 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  recipeId: string;
}

export class MealPlanEntryResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({
    example: '2026-10-20',
    format: 'date',
    description: 'Calendar day (YYYY-MM-DD).',
  })
  date: string;

  @ApiProperty(mealProperty)
  meal: MealType;

  @ApiProperty({ type: RecipeSummaryResponse })
  recipe: RecipeSummaryResponse;

  @ApiProperty({
    description:
      'True when the recipe has something the restrictions of the user forbid: they changed after it was planned. The app has to warn about it.',
  })
  recipeConflicts: boolean;

  static from(entry: MealPlanEntry): MealPlanEntryResponse {
    return {
      id: entry.id,
      date: entry.date.toISOString().slice(0, 10),
      meal: entry.meal,
      recipe: RecipeSummaryResponse.from(entry.recipe),
      recipeConflicts: hasConflicts(entry.recipe.safety),
    };
  }
}

export class MealPlanResponse {
  @ApiProperty({
    type: [MealPlanEntryResponse],
    description: 'By day, and by meal of the day: breakfast, lunch, dinner.',
  })
  entries: MealPlanEntryResponse[];

  static from(entries: MealPlanEntry[]): MealPlanResponse {
    return {
      entries: entries.map((entry) => MealPlanEntryResponse.from(entry)),
    };
  }
}
