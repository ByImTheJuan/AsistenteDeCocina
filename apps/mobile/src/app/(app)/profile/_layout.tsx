import { Stack } from 'expo-router';

// The profile tab has its own stack so each section opens above the menu
// with the platform's back navigation.
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Perfil', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="food-preferences" />
      <Stack.Screen name="dietary-restrictions" />
    </Stack>
  );
}
