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
  DietaryRestrictionsResponse,
  SaveDietaryRestrictionsRequest,
} from './dietary-restrictions.dto.js';
import { DietaryRestrictionsService } from './dietary-restrictions.service.js';

// Every route acts on the user of the access token; no user ID is ever taken
// from the request.
@ApiTags('dietary-restrictions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('dietary-restrictions')
export class DietaryRestrictionsController {
  constructor(
    @Inject(DietaryRestrictionsService)
    private readonly restrictions: DietaryRestrictionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Return the allergies and intolerances of the user',
    description:
      'Safety restrictions, apart from the food preferences. Empty when the user has not registered any.',
  })
  @ApiOkResponse({ type: DietaryRestrictionsResponse })
  async get(
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<DietaryRestrictionsResponse> {
    return DietaryRestrictionsResponse.from(
      await this.restrictions.get(current),
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Replace the allergies and intolerances',
    description:
      'Saves both lists together; whatever is left out of one is removed from it.',
  })
  @ApiOkResponse({ type: DietaryRestrictionsResponse })
  @ApiBadRequestResponse({
    description:
      'Invalid body or an ingredient that is not in the catalogue (`unknown_ingredient`)',
  })
  async replace(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: SaveDietaryRestrictionsRequest,
  ): Promise<DietaryRestrictionsResponse> {
    return DietaryRestrictionsResponse.from(
      await this.restrictions.replace(current, body),
    );
  }
}
