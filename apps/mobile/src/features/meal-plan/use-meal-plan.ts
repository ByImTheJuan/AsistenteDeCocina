import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as mealPlanApi from './meal-plan-api';
import type { MealPlanEntryInput } from './meal-plan-api';
import { addDays } from './week';

import { useSession } from '@/features/auth/session-provider';

// Each week is cached apart. An entry can move from one week to another, so
// every change asks again for all of them. The recipes are read against the
// restrictions: saving them invalidates this key too (use-dietary-restrictions.ts).
export const mealPlanQueryKey = ['meal-plan'] as const;

/** The plan of the week that starts on `start`, a Monday. */
export function useMealPlan(start: string) {
  const { request } = useSession();
  const end = addDays(start, 6);
  return useQuery({
    queryKey: [...mealPlanQueryKey, start, end],
    queryFn: () => mealPlanApi.getMealPlan(request, start, end),
  });
}

function useRefreshMealPlan() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: mealPlanQueryKey });
}

/** Plans a recipe, or with `id` changes the day, meal or recipe of an entry. */
export function useSaveMealPlanEntry() {
  const { request } = useSession();
  const refresh = useRefreshMealPlan();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MealPlanEntryInput }) =>
      id === undefined
        ? mealPlanApi.addMealPlanEntry(request, input)
        : mealPlanApi.updateMealPlanEntry(request, id, input),
    onSuccess: refresh,
  });
}

export function useRemoveMealPlanEntry(id: string) {
  const { request } = useSession();
  const refresh = useRefreshMealPlan();
  return useMutation({
    mutationFn: () => mealPlanApi.removeMealPlanEntry(request, id),
    onSuccess: refresh,
  });
}
