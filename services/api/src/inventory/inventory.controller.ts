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
  CreateInventoryItemRequest,
  InventoryItemResponse,
  InventoryResponse,
  UpdateInventoryItemRequest,
} from './inventory.dto.js';
import { InventoryService, MAX_INVENTORY_ITEMS } from './inventory.service.js';

const notFound = {
  description:
    'The user has no item with that id (`inventory_item_not_found`), whether it does not exist or belongs to someone else',
};
const invalidQuantity =
  'Invalid body, a quantity without a unit or a unit without a quantity (`incomplete_quantity`), or a unit the food is not measured in (`unit_not_allowed`)';

// Every route acts on the user of the access token; no user ID is ever taken
// from the request.
@ApiTags('inventory')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the foods the user has at home',
    description:
      'Ordered by food name, and by the order they were added for the same food. Empty when nothing has been added.',
  })
  @ApiOkResponse({ type: InventoryResponse })
  async list(
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<InventoryResponse> {
    return InventoryResponse.from(await this.inventory.list(current));
  }

  @Post()
  @ApiOperation({
    summary: 'Add a food to the inventory',
    description:
      'The same food can be added more than once; items are never merged.',
  })
  @ApiCreatedResponse({ type: InventoryItemResponse })
  @ApiBadRequestResponse({
    description: `${invalidQuantity}, or an ingredient that is not in the catalogue (\`unknown_ingredient\`)`,
  })
  @ApiConflictResponse({
    description: `The inventory already has ${MAX_INVENTORY_ITEMS} items (\`inventory_full\`)`,
  })
  async add(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: CreateInventoryItemRequest,
  ): Promise<InventoryItemResponse> {
    return InventoryItemResponse.from(await this.inventory.add(current, body));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace the quantity and unit of an item' })
  @ApiOkResponse({ type: InventoryItemResponse })
  @ApiBadRequestResponse({ description: invalidQuantity })
  @ApiNotFoundResponse(notFound)
  async update(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateInventoryItemRequest,
  ): Promise<InventoryItemResponse> {
    return InventoryItemResponse.from(
      await this.inventory.update(current, id, body),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove an item from the inventory' })
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiNotFoundResponse(notFound)
  async remove(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.inventory.remove(current, id);
  }
}
