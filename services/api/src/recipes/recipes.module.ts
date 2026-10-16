import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DietaryRestrictionsModule } from '../dietary-restrictions/dietary-restrictions.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { NutritionGoalsModule } from '../nutrition-goals/nutrition-goals.module.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [
    AuthModule,
    DietaryRestrictionsModule,
    InventoryModule,
    NutritionGoalsModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
