import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FoodPreferencesController } from './food-preferences.controller.js';
import { FoodPreferencesService } from './food-preferences.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FoodPreferencesController],
  providers: [FoodPreferencesService],
  exports: [FoodPreferencesService],
})
export class FoodPreferencesModule {}
