import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as inventoryApi from './inventory-api';
import type { Inventory, InventoryItem, QuantityInput } from './inventory-api';

import { useSession } from '@/features/auth/session-provider';

const inventoryQueryKey = ['inventory'] as const;

export function useInventory() {
  const { request } = useSession();
  return useQuery({
    queryKey: inventoryQueryKey,
    queryFn: () => inventoryApi.getInventory(request),
  });
}

// Each confirmed change updates the cached inventory with what the API
// answered, so the list is current without asking again. A failed change
// leaves it as it was.

// In the order of the API: by food name, the same food in the order it was
// added. The sort is stable, so a new item goes after the others of its food.
function sorted(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'es'));
}

function useUpdateCachedInventory() {
  const queryClient = useQueryClient();
  return (change: (items: InventoryItem[]) => InventoryItem[]) =>
    queryClient.setQueryData<Inventory>(
      inventoryQueryKey,
      (inventory) => inventory && { items: change(inventory.items) },
    );
}

export function useAddInventoryItem() {
  const { request } = useSession();
  const updateCache = useUpdateCachedInventory();
  return useMutation({
    mutationFn: (item: QuantityInput & { ingredientId: string }) =>
      inventoryApi.addInventoryItem(request, item),
    onSuccess: (added) => updateCache((items) => sorted([...items, added])),
  });
}

export function useUpdateInventoryItem(id: string) {
  const { request } = useSession();
  const updateCache = useUpdateCachedInventory();
  return useMutation({
    mutationFn: (quantity: QuantityInput) =>
      inventoryApi.updateInventoryItem(request, id, quantity),
    onSuccess: (updated) =>
      updateCache((items) => items.map((item) => (item.id === updated.id ? updated : item))),
  });
}

export function useRemoveInventoryItem(id: string) {
  const { request } = useSession();
  const updateCache = useUpdateCachedInventory();
  return useMutation({
    mutationFn: () => inventoryApi.removeInventoryItem(request, id),
    onSuccess: () => updateCache((items) => items.filter((item) => item.id !== id)),
  });
}
