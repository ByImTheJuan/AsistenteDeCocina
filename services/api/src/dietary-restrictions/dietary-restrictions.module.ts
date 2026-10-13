import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DietaryRestrictionsController } from './dietary-restrictions.controller.js';
import { DietaryRestrictionsService } from './dietary-restrictions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DietaryRestrictionsController],
  providers: [DietaryRestrictionsService],
})
export class DietaryRestrictionsModule {}
