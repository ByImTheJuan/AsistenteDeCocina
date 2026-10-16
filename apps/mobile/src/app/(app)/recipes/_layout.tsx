import { Stack } from 'expo-router';

import { RecipeFiltersProvider } from '@/features/recipes/recipe-filters-context';

// The recipes tab has its own stack so a recipe opens above the catalogue
// with the platform's back navigation. The search and filters are shared by
// the list and the filters screen, which opens as a modal.
export default function RecipesLayout() {
  return (
    <RecipeFiltersProvider>
      <Stack screenOptions={{ headerBackTitle: 'Recetas', title: '' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="[id]" />
        <Stack.Screen name="filters" options={{ presentation: 'modal', title: 'Filtros' }} />
      </Stack>
    </RecipeFiltersProvider>
  );
}
