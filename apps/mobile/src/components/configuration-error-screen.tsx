import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';

type ConfigurationErrorScreenProps = {
  /** Technical detail: which variables are missing or invalid. */
  message: string;
};

/** Shown instead of the app when its environment configuration is invalid. */
export function ConfigurationErrorScreen({ message }: ConfigurationErrorScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.centered}>
          Falta configuración
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          La app no puede arrancar porque su configuración no es válida. Crea el archivo
          apps/mobile/.env a partir de .env.example y reinicia el servidor de desarrollo.
        </ThemedText>
        <ThemedText type="code" style={styles.centered}>
          {message}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
});
