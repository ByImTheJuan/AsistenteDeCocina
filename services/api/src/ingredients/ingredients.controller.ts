import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  IngredientResponse,
  IngredientSearchQuery,
} from './ingredients.dto.js';
import {
  INGREDIENT_SEARCH_LIMIT,
  IngredientsService,
} from './ingredients.service.js';

@ApiTags('ingredients')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(
    @Inject(IngredientsService)
    private readonly ingredients: IngredientsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search the ingredient catalogue by name',
    description: `Returns at most ${INGREDIENT_SEARCH_LIMIT} ingredients, ordered by name.`,
  })
  @ApiOkResponse({ type: [IngredientResponse] })
  @ApiBadRequestResponse({ description: 'Invalid search text' })
  async search(
    @Query() query: IngredientSearchQuery,
  ): Promise<IngredientResponse[]> {
    const found = await this.ingredients.search(query.search);
    return found.map((ingredient) => IngredientResponse.from(ingredient));
  }
}
