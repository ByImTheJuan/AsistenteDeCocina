import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from './primary-button';
import type { SignInFailure } from './session-manager';
import { useSession } from './session-provider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const failureMessages: Record<SignInFailure, string> = {
  cancelled: 'Has cancelado el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.',
  unavailable:
    'El inicio de sesión con Google no está incluido en esta versión de la app. Si usas Expo Go o una development build antigua, instala una development build actualizada.',
  'play-services':
    'Google Play Services no está disponible o necesita actualizarse en este dispositivo.',
  network: 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  rejected: 'No hemos podido verificar tu cuenta de Google. Inténtalo de nuevo.',
  unknown: 'Ha ocurrido un error inesperado al iniciar sesión. Inténtalo de nuevo.',
};

/**
 * Entry screen for anyone without an active session. It also covers the two
 * moments before that is known: recovering a saved session and failing to
 * reach the API while doing so.
 */
export function SignInScreen() {
  const { session, signIn, retry } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [failure, setFailure] = useState<SignInFailure | null>(null);

  async function handleSignIn() {
    setFailure(null);
    setSigningIn(true);
    const result = await signIn();
    setSigningIn(false);
    if (!result.ok) {
      setFailure(result.reason);
    }
  }

  if (session.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator accessibilityLabel="Recuperando tu sesión" />
      </ThemedView>
    );
  }

  if (session.status === 'unavailable') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.content}>
          <ThemedText type="subtitle" style={styles.centered}>
            Sin conexión
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            No hemos podido conectar con el servidor para recuperar tu sesión.
          </ThemedText>
          <PrimaryButton label="Reintentar" onPress={() => void retry()} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="subtitle" style={styles.centered}>
          Asistente de Cocina
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          Inicia sesión para guardar tus preferencias, tu despensa y tus recetas.
        </ThemedText>
        <PrimaryButton
          label="Continuar con Google"
          loading={signingIn}
          onPress={() => void handleSignIn()}
        />
        {failure && (
          <ThemedText type="small" accessibilityRole="alert" style={styles.centered}>
            {failureMessages[failure]}
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
});
