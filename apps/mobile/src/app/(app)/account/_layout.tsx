import { Stack } from 'expo-router';

// The account tab has its own stack so its forms open above the main screen
// with the platform's back navigation.
export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Cuenta', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="password" />
      <Stack.Screen name="remove-method" />
      <Stack.Screen name="delete" />
    </Stack>
  );
}
