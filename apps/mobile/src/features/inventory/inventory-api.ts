import { z } from 'zod';

import { calendarDaySchema, expiryKindSchema, storageLocationSchema } from './expiry';

import type { AuthorizedRequest } from '@/features/account/account-api';
import { ingredientSchema } from '@/features/ingredients/ingredients-api';
import { unitSchema } from '@/features/units/units';

// A food the user has at home. Without a quantity, both the quantity and the
// unit are null: the food is always available in the kitchen. The date (a
// calendar day) and its kind, and the location, are null when not known.
const inventoryItemSchema = z.object({
  id: z.string(),
  ingredient: ingredientSchema,
  quantity: z.number().nullable(),
  unit: unitSchema.nullable(),
  expiresOn: calendarDaySchema.nullable(),
  dateKind: expiryKindSchema.nullable(),
  location: storageLocationSchema.nullable(),
});

const inventorySchema = z.object({ items: z.array(inventoryItemSchema) });

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type Inventory = z.infer<typeof inventorySchema>;

/** A quantity and its unit go together: both are given or both are null. */
export type QuantityInput = Pick<InventoryItem, 'quantity' | 'unit'>;

/** What the user can change of an item. A date and its kind also go together. */
export type InventoryItemInput = Pick<
  InventoryItem,
  'quantity' | 'unit' | 'expiresOn' | 'dateKind' | 'location'
>;

/** By food name; the same food in the order it was added. */
export async function getInventory(request: AuthorizedRequest): Promise<Inventory> {
  return inventorySchema.parse(await request('/inventory'));
}

export async function addInventoryItem(
  request: AuthorizedRequest,
  item: InventoryItemInput & { ingredientId: string },
): Promise<InventoryItem> {
  return inventoryItemSchema.parse(await request('/inventory', { method: 'POST', body: item }));
}

export async function updateInventoryItem(
  request: AuthorizedRequest,
  id: string,
  input: InventoryItemInput,
): Promise<InventoryItem> {
  return inventoryItemSchema.parse(
    await request(`/inventory/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
  );
}

export async function removeInventoryItem(request: AuthorizedRequest, id: string): Promise<void> {
  await request(`/inventory/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
