// One import per weight: the package index would bundle all sixteen files.
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConfigurationErrorScreen } from '@/components/configuration-error-screen';
import { envError } from '@/config/app-env';
import { Colors, FontFamily } from '@/constants/theme';
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

// Headers and tabs drawn by the navigator use the same tokens as the screens.
const navigationTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.textPrimary,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.textPrimary,
    border: Colors.light.border,
    notification: Colors.light.error,
  },
  fonts: {
    regular: { fontFamily: FontFamily.regular, fontWeight: 'normal' },
    medium: { fontFamily: FontFamily.semiBold, fontWeight: 'normal' },
    bold: { fontFamily: FontFamily.bold, fontWeight: 'normal' },
    heavy: { fontFamily: FontFamily.bold, fontWeight: 'normal' },
  },
};

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
  // The splash screen stays up while the fonts load. If they fail, the app
  // starts anyway with the system font.
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const theme = navigationTheme;

  if (envError) {
    return (
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
        <ConfigurationErrorScreen message={envError} />
      </ThemeProvider>
    );
  }

  // Gestures, such as swiping the recommended recipes, need the root view.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="dark" />
            <AnimatedSplashOverlay />
            <RootNavigator />
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
