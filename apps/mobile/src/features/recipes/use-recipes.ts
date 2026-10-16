import { useQuery } from '@tanstack/react-query';

import * as recipesApi from './recipes-api';

import { useSession } from '@/features/auth/session-provider';
import { today } from '@/features/inventory/expiry';

// The catalogue depends on the user's restrictions: saving them invalidates
// everything under this key (use-dietary-restrictions.ts).
export const recipesQueryKey = ['recipes'] as const;

export function useRecipeCatalogue() {
  const { request } = useSession();
  return useQuery({
    queryKey: recipesQueryKey,
    queryFn: () => recipesApi.getRecipeCatalogue(request),
  });
}

// Depends on the pantry too: changing it invalidates this key (use-inventory.ts).
export const pantryRecipesQueryKey = [...recipesQueryKey, 'pantry'] as const;

/** The recipes against the pantry, for the device's day. */
export function usePantryRecipes() {
  const { request } = useSession();
  const day = today();
  return useQuery({
    queryKey: [...pantryRecipesQueryKey, day],
    queryFn: () => recipesApi.getPantryRecipes(request, day),
  });
}

export function useRecipe(id: string) {
  const { request } = useSession();
  return useQuery({
    queryKey: [...recipesQueryKey, id],
    queryFn: () => recipesApi.getRecipe(request, id),
  });
}
