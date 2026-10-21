import { Stack } from 'expo-router';

// The profile tab has its own stack so each section, the account among them,
// opens above the menu with the platform's back navigation.
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Perfil', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="food-preferences" />
      <Stack.Screen name="dietary-restrictions" />
      <Stack.Screen name="nutrition-goals" />
      <Stack.Screen name="account/index" />
      {/* The account forms go back to the account, not to the profile. */}
      <Stack.Screen name="account/password" options={{ headerBackTitle: 'Cuenta' }} />
      <Stack.Screen name="account/remove-method" options={{ headerBackTitle: 'Cuenta' }} />
      <Stack.Screen name="account/delete" options={{ headerBackTitle: 'Cuenta' }} />
    </Stack>
  );
}
