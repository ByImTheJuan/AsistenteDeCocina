import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { NutritionGoals } from './nutrition-goals.service.js';

// Wide on purpose: the limits catch typing mistakes, they are not advice.
export const NUTRITION_GOAL_RANGES = {
  dailyCalories: { min: 500, max: 10_000 },
  mealCalories: { min: 50, max: 5_000 },
  dailyProtein: { min: 1, max: 500 },
} as const;

const { dailyCalories, mealCalories, dailyProtein } = NUTRITION_GOAL_RANGES;

const enabledProperty = {
  description: 'False keeps the value but stops applying the goal',
};

export class DailyCaloriesGoal {
  @ApiProperty({
    description: 'Kilocalories per day',
    ...toSchema(dailyCalories),
  })
  @IsInt()
  @Min(dailyCalories.min)
  @Max(dailyCalories.max)
  value: number;

  @ApiProperty(enabledProperty)
  @IsBoolean()
  enabled: boolean;
}

export class MealCaloriesGoal {
  @ApiProperty({
    description: 'Kilocalories per meal',
    ...toSchema(mealCalories),
  })
  @IsInt()
  @Min(mealCalories.min)
  @Max(mealCalories.max)
  value: number;

  @ApiProperty(enabledProperty)
  @IsBoolean()
  enabled: boolean;
}

export class DailyProteinGoal {
  @ApiProperty({
    description: 'Grams of protein per day',
    ...toSchema(dailyProtein),
  })
  @IsInt()
  @Min(dailyProtein.min)
  @Max(dailyProtein.max)
  value: number;

  @ApiProperty(enabledProperty)
  @IsBoolean()
  enabled: boolean;
}

function toSchema(range: { min: number; max: number }) {
  return { type: 'integer' as const, minimum: range.min, maximum: range.max };
}

// The three goals are required but nullable: null means the goal is not set.
// The same shape is what the API returns.
export class NutritionGoalsBody implements NutritionGoals {
  @ApiProperty({ type: DailyCaloriesGoal, nullable: true })
  @ValidateIf((body: NutritionGoalsBody) => body.dailyCalories !== null)
  @IsDefined()
  @ValidateNested()
  @Type(() => DailyCaloriesGoal)
  dailyCalories: DailyCaloriesGoal | null;

  @ApiProperty({ type: MealCaloriesGoal, nullable: true })
  @ValidateIf((body: NutritionGoalsBody) => body.mealCalories !== null)
  @IsDefined()
  @ValidateNested()
  @Type(() => MealCaloriesGoal)
  mealCalories: MealCaloriesGoal | null;

  @ApiProperty({ type: DailyProteinGoal, nullable: true })
  @ValidateIf((body: NutritionGoalsBody) => body.dailyProtein !== null)
  @IsDefined()
  @ValidateNested()
  @Type(() => DailyProteinGoal)
  dailyProtein: DailyProteinGoal | null;
}
