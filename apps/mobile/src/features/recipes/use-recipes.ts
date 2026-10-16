import { keepPreviousData, useQuery } from '@tanstack/react-query';

import * as recipesApi from './recipes-api';

import { useSession } from '@/features/auth/session-provider';
import { today } from '@/features/inventory/expiry';

// The catalogue depends on the user's restrictions: saving them invalidates
// everything under this key (use-dietary-restrictions.ts).
export const recipesQueryKey = ['recipes'] as const;

/** The apt recipes; `query` (from toQuery) searches, filters and sorts them. */
export function useRecipeCatalogue(query = '') {
  const { request } = useSession();
  return useQuery({
    queryKey: [...recipesQueryKey, 'catalogue', query],
    queryFn: () => recipesApi.getRecipeCatalogue(request, query),
    // Keeps the previous list on screen while a new search loads.
    placeholderData: keepPreviousData,
  });
}

// Depends on the pantry too: changing it invalidates this key (use-inventory.ts).
export const pantryRecipesQueryKey = [...recipesQueryKey, 'pantry'] as const;

/** The recipes against the pantry, for the device's day, with the same `query`. */
export function usePantryRecipes(query = '') {
  const { request } = useSession();
  const day = today();
  return useQuery({
    queryKey: [...pantryRecipesQueryKey, day, query],
    queryFn: () => recipesApi.getPantryRecipes(request, day, query),
    placeholderData: keepPreviousData,
  });
}

// Depends on the pantry and on the whole profile: saving the preferences, the
// restrictions or the goals invalidates `recipesQueryKey`, and changing the
// pantry invalidates this key too.
export const recommendationsQueryKey = [...recipesQueryKey, 'recommendations'] as const;

/** The recipes recommended for the user, for the device's day. */
export function useRecommendations() {
  const { request } = useSession();
  const day = today();
  return useQuery({
    queryKey: [...recommendationsQueryKey, day],
    queryFn: () => recipesApi.getRecommendations(request, day),
  });
}

export function useRecipe(id: string) {
  const { request } = useSession();
  return useQuery({
    queryKey: [...recipesQueryKey, id],
    queryFn: () => recipesApi.getRecipe(request, id),
  });
}
