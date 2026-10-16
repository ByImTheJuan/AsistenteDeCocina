import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as foodPreferencesApi from './food-preferences-api';
import type { FoodPreferences } from './food-preferences-api';

import { useSession } from '@/features/auth/session-provider';
import { dietaryRestrictionsQueryKey } from '@/features/dietary-restrictions/use-dietary-restrictions';
import { recommendationsQueryKey } from '@/features/recipes/use-recipes';

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
    onSuccess: (saved) => {
      queryClient.setQueryData(foodPreferencesQueryKey, saved);
      // The restrictions report which liked foods they forbid.
      void queryClient.invalidateQueries({ queryKey: dietaryRestrictionsQueryKey });
      // Recommendations follow the diet and the tastes.
      void queryClient.invalidateQueries({ queryKey: recommendationsQueryKey });
    },
  });
}
