import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { FoodPreferences } from './food-preferences-api';
import { dietLabels } from './labels';
import { useFoodPreferences } from './use-food-preferences';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

function summarize({ diet, liked, avoided }: FoodPreferences): string {
  const parts = [
    diet && dietLabels[diet],
    liked.length > 0 && `${liked.length} me gustan`,
    avoided.length > 0 && `${avoided.length} a evitar`,
  ].filter((part) => typeof part === 'string');
  return parts.length > 0 ? parts.join(' · ') : 'Sin configurar';
}

/** Menu of what the user tells the app about how they eat. */
export function ProfileScreen() {
  const router = useRouter();
  const { data: preferences, isPending } = useFoodPreferences();

  // The entry opens either way; its own screen reports a failed load.
  const summary = preferences
    ? summarize(preferences)
    : isPending
      ? 'Cargando…'
      : 'No se han podido cargar';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView style={styles.content}>
          <ThemedText type="subtitle">Perfil</ThemedText>
          <ThemedText themeColor="textSecondary">
            Cuéntanos cómo comes para que las recetas encajen contigo. Todo es opcional y puedes
            cambiarlo cuando quieras.
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Preferencias alimentarias: ${summary}`}
            onPress={() => router.push('/profile/food-preferences')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.entry}>
              <View style={styles.entryText}>
                <ThemedText type="smallBold">Preferencias alimentarias</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {summary}
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </ThemedView>
          </Pressable>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  entryText: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
