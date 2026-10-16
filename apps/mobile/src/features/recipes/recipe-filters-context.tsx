import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { noFilters, type RecipeFilters } from './recipe-filters';

type RecipeFiltersState = {
  search: string;
  setSearch(search: string): void;
  filters: RecipeFilters;
  setFilters(filters: RecipeFilters): void;
  /** Back to the whole apt catalogue: no search and no filters. */
  clear(): void;
};

const RecipeFiltersContext = createContext<RecipeFiltersState | null>(null);

/**
 * What the user is searching and filtering in the "Recetas" tab, shared by the
 * list and the filters screen. It lasts as long as the tab.
 */
export function RecipeFiltersProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RecipeFilters>(noFilters);
  const value = useMemo(
    () => ({
      search,
      setSearch,
      filters,
      setFilters,
      clear: () => {
        setSearch('');
        setFilters(noFilters);
      },
    }),
    [search, filters],
  );
  return <RecipeFiltersContext.Provider value={value}>{children}</RecipeFiltersContext.Provider>;
}

export function useRecipeFilters(): RecipeFiltersState {
  const state = useContext(RecipeFiltersContext);
  if (!state) {
    throw new Error('useRecipeFilters needs a RecipeFiltersProvider');
  }
  return state;
}
