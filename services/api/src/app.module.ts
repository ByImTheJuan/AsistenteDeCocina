import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountModule } from './account/account.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.validation.js';
import { DietaryRestrictionsModule } from './dietary-restrictions/dietary-restrictions.module.js';
import { FoodPreferencesModule } from './food-preferences/food-preferences.module.js';
import { HealthModule } from './health/health.module.js';
import { IngredientsModule } from './ingredients/ingredients.module.js';
import { NutritionGoalsModule } from './nutrition-goals/nutrition-goals.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AccountModule,
    IngredientsModule,
    FoodPreferencesModule,
    DietaryRestrictionsModule,
    NutritionGoalsModule,
  ],
})
export class AppModule {}
