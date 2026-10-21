import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
  MealPlanEntryRequest,
  MealPlanEntryResponse,
  MealPlanQuery,
  MealPlanResponse,
} from './meal-plan.dto.js';
import { MAX_PLAN_DAYS, MealPlanService } from './meal-plan.service.js';

const notFound = {
  description:
    'The user has no entry with that id (`meal_plan_entry_not_found`), whether it does not exist or belongs to someone else',
};
const invalidEntry = {
  description:
    'Invalid body, or a recipe that is not in the catalogue (`unknown_recipe`)',
};
const conflict = {
  description:
    'That meal of that day already has a recipe (`meal_slot_taken`), or the recipe has something the restrictions of the user forbid (`recipe_not_allowed`)',
};

// Every route acts on the user of the access token; no user ID is ever taken
// from the request.
@ApiTags('meal-plan')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('meal-plan')
export class MealPlanController {
  constructor(
    @Inject(MealPlanService) private readonly mealPlan: MealPlanService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the planned recipes of some days',
    description: `From \`from\` to \`to\`, both included and ${MAX_PLAN_DAYS} days at most, by day and meal. Empty when nothing is planned.`,
  })
  @ApiOkResponse({ type: MealPlanResponse })
  @ApiBadRequestResponse({
    description:
      'A day is not a valid YYYY-MM-DD, or the range goes backwards or is too long (`invalid_range`)',
  })
  async list(
    @CurrentUser() current: AuthenticatedUser,
    @Query() { from, to }: MealPlanQuery,
  ): Promise<MealPlanResponse> {
    return MealPlanResponse.from(await this.mealPlan.list(current, from, to));
  }

  @Post()
  @ApiOperation({
    summary: 'Plan a recipe for a meal of a day',
    description:
      'Each meal of a day holds one recipe. The recipe has to be apt for the restrictions of the user.',
  })
  @ApiCreatedResponse({ type: MealPlanEntryResponse })
  @ApiBadRequestResponse(invalidEntry)
  @ApiConflictResponse(conflict)
  async add(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: MealPlanEntryRequest,
  ): Promise<MealPlanEntryResponse> {
    return MealPlanEntryResponse.from(await this.mealPlan.add(current, body));
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Change the day, the meal or the recipe of an entry',
    description:
      'A new recipe has to be apt for the restrictions of the user; the one already planned can be moved even if they changed.',
  })
  @ApiOkResponse({ type: MealPlanEntryResponse })
  @ApiBadRequestResponse(invalidEntry)
  @ApiNotFoundResponse(notFound)
  @ApiConflictResponse(conflict)
  async update(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: MealPlanEntryRequest,
  ): Promise<MealPlanEntryResponse> {
    return MealPlanEntryResponse.from(
      await this.mealPlan.update(current, id, body),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove an entry from the plan',
    description: 'The recipe stays in the catalogue.',
  })
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiNotFoundResponse(notFound)
  async remove(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.mealPlan.remove(current, id);
  }
}
