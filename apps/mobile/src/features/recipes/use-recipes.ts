import { useQuery } from '@tanstack/react-query';

import * as recipesApi from './recipes-api';

import { useSession } from '@/features/auth/session-provider';

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

export function useRecipe(id: string) {
  const { request } = useSession();
  return useQuery({
    queryKey: [...recipesQueryKey, id],
    queryFn: () => recipesApi.getRecipe(request, id),
  });
}
