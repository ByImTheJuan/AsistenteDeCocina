import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

// Stable identifiers the app maps to messages. The 400 ones share the status
// with the validation errors, so the status alone would not tell them apart.
export type InventoryErrorCode =
  | 'unknown_ingredient'
  | 'incomplete_quantity'
  | 'unit_not_allowed'
  | 'incomplete_date'
  | 'inventory_item_not_found'
  | 'inventory_full';

export function inventoryBadRequest(
  code: Extract<
    InventoryErrorCode,
    | 'unknown_ingredient'
    | 'incomplete_quantity'
    | 'unit_not_allowed'
    | 'incomplete_date'
  >,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    code,
    message,
  });
}

// Also for another user's item: whether it exists is not theirs to know.
export function inventoryItemNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    code: 'inventory_item_not_found' satisfies InventoryErrorCode,
    message: 'The inventory has no such item',
  });
}

export function inventoryFull(limit: number): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code: 'inventory_full' satisfies InventoryErrorCode,
    message: `The inventory cannot hold more than ${limit} items`,
  });
}
