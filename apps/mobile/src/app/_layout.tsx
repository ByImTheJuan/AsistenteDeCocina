import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConfigurationErrorScreen } from '@/components/configuration-error-screen';
import { envError } from '@/config/app-env';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { NetworkError } from '@/lib/api-client';

SplashScreen.preventAutoHideAsync();

// Only connection failures are worth retrying: an error status from the API
// will not change by asking again.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => error instanceof NetworkError && failureCount < 2,
    },
  },
});

// The private area is only reachable with a session; everything else lands
// on the sign-in screen. Expo Router redirects when a guard changes.
function RootNavigator() {
  const { session } = useSession();
  const signedIn = session.status === 'signedIn';

  // Cached answers belong to the account that asked for them.
  useEffect(() => {
    if (!signedIn) {
      queryClient.clear();
    }
  }, [signedIn]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  if (envError) {
    return (
      <ThemeProvider value={theme}>
        <AnimatedSplashOverlay />
        <ConfigurationErrorScreen message={envError} />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={theme}>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
