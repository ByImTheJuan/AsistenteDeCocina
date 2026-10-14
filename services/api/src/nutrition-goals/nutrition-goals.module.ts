import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NutritionGoalsController } from './nutrition-goals.controller.js';
import { NutritionGoalsService } from './nutrition-goals.service.js';

@Module({
  imports: [AuthModule],
  controllers: [NutritionGoalsController],
  providers: [NutritionGoalsService],
})
export class NutritionGoalsModule {}
