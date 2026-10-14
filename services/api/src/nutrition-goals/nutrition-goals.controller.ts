import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { NutritionGoalsBody } from './nutrition-goals.dto.js';
import { NutritionGoalsService } from './nutrition-goals.service.js';

// Every route acts on the user of the access token; no user ID is ever taken
// from the request.
@ApiTags('nutrition-goals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('nutrition-goals')
export class NutritionGoalsController {
  constructor(
    @Inject(NutritionGoalsService)
    private readonly goals: NutritionGoalsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Return the nutrition goals of the user',
    description: 'Each goal is null until the user sets it.',
  })
  @ApiOkResponse({ type: NutritionGoalsBody })
  get(@CurrentUser() current: AuthenticatedUser): Promise<NutritionGoalsBody> {
    return this.goals.get(current);
  }

  @Put()
  @ApiOperation({
    summary: 'Replace the nutrition goals',
    description:
      'Saves the three goals together. A null goal is removed; one with `enabled` false is kept without being applied.',
  })
  @ApiOkResponse({ type: NutritionGoalsBody })
  @ApiBadRequestResponse({
    description:
      'Invalid body, or calories per meal above the calories per day while both are enabled (`meal_calories_exceed_daily`)',
  })
  replace(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: NutritionGoalsBody,
  ): Promise<NutritionGoalsBody> {
    return this.goals.replace(current, body);
  }
}
