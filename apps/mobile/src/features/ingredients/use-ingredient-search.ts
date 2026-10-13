import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { searchIngredients } from './ingredients-api';

import { useSession } from '@/features/auth/session-provider';

export function useIngredientSearch(search: string) {
  const { request } = useSession();
  return useQuery({
    queryKey: ['ingredients', search.trim().toLowerCase()],
    queryFn: () => searchIngredients(request, search),
    // Keeps the previous results on screen while the next ones load.
    placeholderData: keepPreviousData,
  });
}
