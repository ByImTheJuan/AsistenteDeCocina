import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import type { NutritionGoalKind } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** A goal switched off keeps its value but must not be applied. */
export type NutritionGoalValue = { value: number; enabled: boolean };

// Null for the goals the user has not set.
export type NutritionGoals = {
  dailyCalories: NutritionGoalValue | null;
  mealCalories: NutritionGoalValue | null;
  dailyProtein: NutritionGoalValue | null;
};

const kinds = {
  dailyCalories: 'DAILY_CALORIES',
  mealCalories: 'MEAL_CALORIES',
  dailyProtein: 'DAILY_PROTEIN',
} as const satisfies Record<keyof NutritionGoals, NutritionGoalKind>;

const fields = Object.keys(kinds) as (keyof NutritionGoals)[];

@Injectable()
export class NutritionGoalsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Every goal is null for a user who has never saved any. */
  async get(current: AuthenticatedUser): Promise<NutritionGoals> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        nutritionGoals: { select: { kind: true, value: true, enabled: true } },
      },
    });
    if (!user) {
      throw invalidAccessToken();
    }

    const goalOf = (field: keyof NutritionGoals): NutritionGoalValue | null => {
      const goal = user.nutritionGoals.find(
        ({ kind }) => kind === kinds[field],
      );
      return goal ? { value: goal.value, enabled: goal.enabled } : null;
    };
    return {
      dailyCalories: goalOf('dailyCalories'),
      mealCalories: goalOf('mealCalories'),
      dailyProtein: goalOf('dailyProtein'),
    };
  }

  /** Replaces the saved goals with the given ones; a null goal is removed. */
  async replace(
    current: AuthenticatedUser,
    goals: NutritionGoals,
  ): Promise<NutritionGoals> {
    const { dailyCalories, mealCalories } = goals;
    // Only goals in use are compared: one switched off is not applied.
    if (
      dailyCalories?.enabled &&
      mealCalories?.enabled &&
      mealCalories.value > dailyCalories.value
    ) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'meal_calories_exceed_daily',
        message: 'The calories per meal cannot exceed the calories per day',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // A valid access token can outlive its account by a few minutes.
      const account = await tx.user.findUnique({
        where: { id: current.id },
        select: { id: true },
      });
      if (!account) {
        throw invalidAccessToken();
      }
      await tx.nutritionGoal.deleteMany({ where: { userId: current.id } });
      await tx.nutritionGoal.createMany({
        data: fields.flatMap((field) => {
          const goal = goals[field];
          return goal
            ? [
                {
                  userId: current.id,
                  kind: kinds[field],
                  value: goal.value,
                  enabled: goal.enabled,
                },
              ]
            : [];
        }),
      });
    });

    return this.get(current);
  }
}

function invalidAccessToken(): UnauthorizedException {
  return new UnauthorizedException('Invalid access token');
}
