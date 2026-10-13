import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as foodPreferencesApi from './food-preferences-api';
import type { FoodPreferences } from './food-preferences-api';

import { useSession } from '@/features/auth/session-provider';

const foodPreferencesQueryKey = ['food-preferences'] as const;

export function useFoodPreferences() {
  const { request } = useSession();
  return useQuery({
    queryKey: foodPreferencesQueryKey,
    queryFn: () => foodPreferencesApi.getFoodPreferences(request),
  });
}

// Saving returns what was stored, which replaces the cached preferences so
// the profile menu is current without asking again.
export function useSaveFoodPreferences() {
  const { request } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: FoodPreferences) =>
      foodPreferencesApi.saveFoodPreferences(request, preferences),
    onSuccess: (saved) => queryClient.setQueryData(foodPreferencesQueryKey, saved),
  });
}

export function useIngredientSearch(search: string) {
  const { request } = useSession();
  return useQuery({
    queryKey: ['ingredients', search.trim().toLowerCase()],
    queryFn: () => foodPreferencesApi.searchIngredients(request, search),
    // Keeps the previous results on screen while the next ones load.
    placeholderData: keepPreviousData,
  });
}
