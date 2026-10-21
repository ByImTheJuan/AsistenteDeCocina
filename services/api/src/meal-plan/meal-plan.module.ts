import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DietaryRestrictionsModule } from '../dietary-restrictions/dietary-restrictions.module.js';
import { MealPlanController } from './meal-plan.controller.js';
import { MealPlanService } from './meal-plan.service.js';

@Module({
  imports: [AuthModule, DietaryRestrictionsModule],
  controllers: [MealPlanController],
  providers: [MealPlanService],
})
export class MealPlanModule {}
