import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import {
  RecipeCatalogueResponse,
  RecipeDetailResponse,
} from './recipes.dto.js';
import { RecipesService } from './recipes.service.js';

// The catalogue is the same for everyone, but it is read against the safety
// restrictions of the user of the access token.
@ApiTags('recipes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(
    @Inject(RecipesService) private readonly recipes: RecipesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the recipe catalogue',
    description:
      'Recipes with no allergen or ingredient the user has restricted, by name, and how many were left out.',
  })
  @ApiOkResponse({ type: RecipeCatalogueResponse })
  async catalogue(
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<RecipeCatalogueResponse> {
    return RecipeCatalogueResponse.from(await this.recipes.catalogue(current));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a recipe with its ingredients and steps',
    description:
      'Also for a recipe hidden from the catalogue, which comes with its conflicts with the restrictions of the user.',
  })
  @ApiOkResponse({ type: RecipeDetailResponse })
  @ApiNotFoundResponse({
    description:
      'The catalogue has no recipe with that id (`recipe_not_found`)',
  })
  async detail(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RecipeDetailResponse> {
    return RecipeDetailResponse.from(await this.recipes.detail(current, id));
  }
}
