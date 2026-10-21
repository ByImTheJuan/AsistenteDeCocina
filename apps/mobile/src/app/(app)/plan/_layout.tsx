import { Stack } from 'expo-router';

// The plan tab has its own stack so choosing a recipe, changing a planned one
// or reading it opens above the week with the platform's back navigation.
export default function PlanLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Plan', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="assign" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
  );
}
