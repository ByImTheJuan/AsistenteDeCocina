import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as dietaryRestrictionsApi from './dietary-restrictions-api';
import type { DietaryRestrictionsDraft } from './dietary-restrictions-api';

import { useSession } from '@/features/auth/session-provider';
import { mealPlanQueryKey } from '@/features/meal-plan/use-meal-plan';
import { recipesQueryKey } from '@/features/recipes/use-recipes';

export const dietaryRestrictionsQueryKey = ['dietary-restrictions'] as const;

export function useDietaryRestrictions() {
  const { request } = useSession();
  return useQuery({
    queryKey: dietaryRestrictionsQueryKey,
    queryFn: () => dietaryRestrictionsApi.getDietaryRestrictions(request),
  });
}

// Saving returns what was stored, which replaces the cached restrictions so
// the profile menu is current without asking again. The recipes are read
// against the restrictions, so they are asked again.
export function useSaveDietaryRestrictions() {
  const { request } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (restrictions: DietaryRestrictionsDraft) =>
      dietaryRestrictionsApi.saveDietaryRestrictions(request, restrictions),
    onSuccess: (saved) => {
      queryClient.setQueryData(dietaryRestrictionsQueryKey, saved);
      void queryClient.invalidateQueries({ queryKey: recipesQueryKey });
      // The plan says which planned recipes now clash with them.
      void queryClient.invalidateQueries({ queryKey: mealPlanQueryKey });
    },
  });
}
