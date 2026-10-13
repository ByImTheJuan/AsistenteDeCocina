import { Redirect, useLocalSearchParams } from 'expo-router';

import { RemoveMethodScreen } from '@/features/account/remove-method-screen';

export default function RemoveMethodRoute() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  if (method !== 'password' && method !== 'google') {
    return <Redirect href="/account" />;
  }
  return <RemoveMethodScreen method={method} />;
}
