import { Stack } from 'expo-router';

// The recipes tab has its own stack so a recipe opens above the catalogue
// with the platform's back navigation.
export default function RecipesLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Recetas', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
