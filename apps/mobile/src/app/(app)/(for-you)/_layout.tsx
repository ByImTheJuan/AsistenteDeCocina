import { Stack } from 'expo-router';

// The "For you" tab has its own stack, so a recommended recipe opens above
// the cards and going back returns to them.
export default function ForYouLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Para ti', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
  );
}
