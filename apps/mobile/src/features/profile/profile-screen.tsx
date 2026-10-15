import { useRouter, type Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
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
import { useTheme } from '@/hooks/use-theme';

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
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Perfil
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Cuéntanos cómo comes para que las recetas encajen contigo. Todo es opcional y puedes
              cambiarlo cuando quieras.
            </ThemedText>
          </View>

          <View style={styles.entries}>
            <Entry
              icon={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
              title="Preferencias alimentarias"
              summary={summaryOf(preferences, summarizePreferences)}
              href="/profile/food-preferences"
            />
            <Entry
              icon={{ ios: 'cross.case', android: 'health_and_safety', web: 'health_and_safety' }}
              title="Alergias e intolerancias"
              summary={summaryOf(restrictions, summarizeRestrictions)}
              href="/profile/dietary-restrictions"
            />
            <Entry
              icon={{ ios: 'target', android: 'track_changes', web: 'track_changes' }}
              title="Objetivos nutricionales"
              summary={summaryOf(goals, summarizeGoals)}
              href="/profile/nutrition-goals"
            />
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

type EntryProps = {
  icon: SymbolViewProps['name'];
  title: string;
  summary: string;
  href: Href;
};

/** One category of the profile: icon, name, what is saved and a way in. */
function Entry({ icon, title, summary, href }: EntryProps) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${summary}`}
      onPress={() => router.push(href)}>
      {({ pressed }) => (
        <Card style={[styles.entry, pressed && { backgroundColor: theme.surfaceSecondary }]}>
          <View style={[styles.icon, { backgroundColor: theme.primary }]}>
            <SymbolView name={icon} size={22} tintColor={theme.onPrimary} />
          </View>
          <View style={styles.entryText}>
            <ThemedText type="defaultBold">{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {summary}
            </ThemedText>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={16}
            tintColor={theme.textSecondary}
          />
        </Card>
      )}
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
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: BottomTabInset + Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.sm,
  },
  entries: {
    gap: Spacing.md,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 76,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  entryText: {
    flex: 1,
    gap: Spacing.xs,
  },
});
