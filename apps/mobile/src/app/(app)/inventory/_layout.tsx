import { Stack } from 'expo-router';

// The inventory tab has its own stack so adding or editing a food opens above
// the list with the platform's back navigation.
export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Mi despensa', title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
