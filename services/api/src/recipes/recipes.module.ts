import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DietaryRestrictionsModule } from '../dietary-restrictions/dietary-restrictions.module.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [AuthModule, DietaryRestrictionsModule],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
