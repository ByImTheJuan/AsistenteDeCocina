import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
  PantryRecipesQuery,
  PantryRecipesResponse,
  RecipeCatalogueResponse,
  RecipeDetailResponse,
  RecommendationsResponse,
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

  // Declared before `:id`, which would otherwise take "pantry" as an id.
  @Get('pantry')
  @ApiOperation({
    summary: 'List the recipes against the pantry',
    description:
      'The apt recipes with what each one takes from home, what is missing or not enough, and what has to be checked. Quantities are compared only between units of the same kind.',
  })
  @ApiOkResponse({ type: PantryRecipesResponse })
  @ApiBadRequestResponse({ description: '`today` is not a valid YYYY-MM-DD' })
  async pantry(
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: PantryRecipesQuery,
  ): Promise<PantryRecipesResponse> {
    return PantryRecipesResponse.from(
      await this.recipes.pantry(current, query.today),
    );
  }

  // Declared before `:id` too.
  @Get('recommendations')
  @ApiOperation({
    summary: 'List the recipes recommended for the user',
    description:
      'The apt recipes that fit the diet and the tastes of the user, the most suitable first: liked ingredients, the pantry and the goal per meal move them up or down. `today` is the day of the user, as for the pantry.',
  })
  @ApiOkResponse({ type: RecommendationsResponse })
  @ApiBadRequestResponse({ description: '`today` is not a valid YYYY-MM-DD' })
  async recommendations(
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: PantryRecipesQuery,
  ): Promise<RecommendationsResponse> {
    return RecommendationsResponse.from(
      await this.recipes.recommendations(current, query.today),
    );
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
