import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as nutritionGoalsApi from './nutrition-goals-api';
import type { NutritionGoals } from './nutrition-goals-api';

import { useSession } from '@/features/auth/session-provider';

const nutritionGoalsQueryKey = ['nutrition-goals'] as const;

export function useNutritionGoals() {
  const { request } = useSession();
  return useQuery({
    queryKey: nutritionGoalsQueryKey,
    queryFn: () => nutritionGoalsApi.getNutritionGoals(request),
  });
}

// Saving returns what was stored, which replaces the cached goals so the
// profile menu is current without asking again.
export function useSaveNutritionGoals() {
  const { request } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goals: NutritionGoals) => nutritionGoalsApi.saveNutritionGoals(request, goals),
    onSuccess: (saved) => queryClient.setQueryData(nutritionGoalsQueryKey, saved),
  });
}
