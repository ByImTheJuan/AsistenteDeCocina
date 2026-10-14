import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { summarizeRestrictions } from '@/features/dietary-restrictions/labels';
import { useDietaryRestrictions } from '@/features/dietary-restrictions/use-dietary-restrictions';
import type { FoodPreferences } from '@/features/food-preferences/food-preferences-api';
import { dietLabels } from '@/features/food-preferences/labels';
import { useFoodPreferences } from '@/features/food-preferences/use-food-preferences';
import { summarizeGoals } from '@/features/nutrition-goals/nutrition-goals-form';
import { useNutritionGoals } from '@/features/nutrition-goals/use-nutrition-goals';

function summarizePreferences({ diet, liked, avoided }: FoodPreferences): string {
  const parts = [
    diet && dietLabels[diet],
    liked.length > 0 && `${liked.length} me gustan`,
    avoided.length > 0 && `${avoided.length} a evitar`,
  ].filter((part) => typeof part === 'string');
  return parts.length > 0 ? parts.join(' · ') : 'Sin configurar';
}

// Each entry opens whatever its summary says; its own screen reports a
// failed load.
function summaryOf<Data>(
  query: { data: Data | undefined; isPending: boolean },
  summarize: (data: Data) => string,
): string {
  if (query.data !== undefined) {
    return summarize(query.data);
  }
  return query.isPending ? 'Cargando…' : 'No se han podido cargar';
}

/** Menu of what the user tells the app about how they eat. */
export function ProfileScreen() {
  const preferences = useFoodPreferences();
  const restrictions = useDietaryRestrictions();
  const goals = useNutritionGoals();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView style={styles.content}>
          <ThemedText type="title">Perfil</ThemedText>
          <ThemedText themeColor="textSecondary">
            Cuéntanos cómo comes para que las recetas encajen contigo. Todo es opcional y puedes
            cambiarlo cuando quieras.
          </ThemedText>

          <Entry
            title="Preferencias alimentarias"
            summary={summaryOf(preferences, summarizePreferences)}
            href="/profile/food-preferences"
          />
          <Entry
            title="Alergias e intolerancias"
            summary={summaryOf(restrictions, summarizeRestrictions)}
            href="/profile/dietary-restrictions"
          />
          <Entry
            title="Objetivos nutricionales"
            summary={summaryOf(goals, summarizeGoals)}
            href="/profile/nutrition-goals"
          />
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function Entry({ title, summary, href }: { title: string; summary: string; href: Href }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${summary}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="surface" style={styles.entry}>
        <View style={styles.entryText}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {summary}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </ThemedView>
    </Pressable>
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
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: BottomTabInset + Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  entryText: {
    flex: 1,
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
