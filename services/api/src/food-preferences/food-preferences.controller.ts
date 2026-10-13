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
import {
  FoodPreferencesResponse,
  SaveFoodPreferencesRequest,
} from './food-preferences.dto.js';
import { FoodPreferencesService } from './food-preferences.service.js';

// Every route acts on the user of the access token; no user ID is ever taken
// from the request.
@ApiTags('food-preferences')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('food-preferences')
export class FoodPreferencesController {
  constructor(
    @Inject(FoodPreferencesService)
    private readonly foodPreferences: FoodPreferencesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Return the diet and the liked and avoided ingredients',
    description: 'Empty when the user has not configured anything yet.',
  })
  @ApiOkResponse({ type: FoodPreferencesResponse })
  async get(
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<FoodPreferencesResponse> {
    return FoodPreferencesResponse.from(
      await this.foodPreferences.get(current),
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Replace the food preferences',
    description:
      'Saves the three values together; whatever is left out of a list is removed from it.',
  })
  @ApiOkResponse({ type: FoodPreferencesResponse })
  @ApiBadRequestResponse({
    description:
      'Invalid body, an ingredient in both lists (`ingredient_in_both_lists`) or not in the catalogue (`unknown_ingredient`)',
  })
  async replace(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: SaveFoodPreferencesRequest,
  ): Promise<FoodPreferencesResponse> {
    return FoodPreferencesResponse.from(
      await this.foodPreferences.replace(current, body),
    );
  }
}
