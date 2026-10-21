import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFLICT, UNCERTAIN } from './labels';
import type { MealPlanEntry } from './meal-plan-api';
import { mealPlanErrorMessage } from './meal-plan-errors';
import { useMealPlan } from './use-meal-plan';
import {
  addDays,
  formatWeek,
  formatWeekday,
  mealLabels,
  mealTypes,
  weekDays,
  weekStart,
  type MealType,
} from './week';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { today } from '@/features/inventory/expiry';
import { formatCalories, formatMinutes } from '@/features/recipes/recipe-format';
import { useTheme } from '@/hooks/use-theme';

/**
 * The meals of a week, from Monday to Sunday, with the recipe planned for
 * each one. An empty meal opens to choose a recipe; a planned one, to change
 * or remove it.
 */
export function MealPlanScreen() {
  const on = today();
  const thisWeek = weekStart(on);
  const [start, setStart] = useState(thisWeek);
  const { data: plan, isPending, error, refetch, isRefetching } = useMealPlan(start);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Plan
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Organiza lo que vas a cocinar cada día. Toca una comida para elegir su receta o
              cambiarla.
            </ThemedText>
          </View>

          <View style={styles.weekNavigation}>
            <View style={styles.weekRow}>
              <WeekButton
                label="Semana anterior"
                icon={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                onPress={() => setStart(addDays(start, -7))}
              />
              <ThemedText
                type="heading"
                accessibilityRole="header"
                accessibilityLabel={`Semana del ${formatWeek(start, on)}`}
                style={styles.weekTitle}>
                {formatWeek(start, on)}
              </ThemedText>
              <WeekButton
                label="Semana siguiente"
                icon={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                onPress={() => setStart(addDays(start, 7))}
              />
            </View>
            {start !== thisWeek && (
              <PrimaryButton
                label="Volver a esta semana"
                variant="secondary"
                onPress={() => setStart(thisWeek)}
              />
            )}
          </View>

          {plan ? (
            <Week start={start} on={on} entries={plan.entries} />
          ) : isPending ? (
            <ScreenState kind="loading" label="Cargando tu plan" />
          ) : (
            <ScreenState
              kind="error"
              title="No se ha podido cargar tu plan"
              message={mealPlanErrorMessage(error)}
              retrying={isRefetching}
              onRetry={() => void refetch()}
            />
          )}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function Week({ start, on, entries }: { start: string; on: string; entries: MealPlanEntry[] }) {
  return (
    <View style={styles.days}>
      {entries.length === 0 && (
        <ThemedText themeColor="textSecondary">
          Todavía no has planificado nada esta semana. Elige un día y una comida para empezar.
        </ThemedText>
      )}
      {weekDays(start).map((day) => (
        <Card key={day} style={styles.day}>
          <ThemedText type="heading" accessibilityRole="header">
            {day === on ? `${formatWeekday(day, on)} · Hoy` : formatWeekday(day, on)}
          </ThemedText>
          {mealTypes.map((meal) => {
            const entry = entries.find((planned) => planned.date === day && planned.meal === meal);
            return entry ? (
              <PlannedMeal key={meal} entry={entry} week={start} on={on} />
            ) : (
              <EmptyMeal key={meal} day={day} meal={meal} on={on} />
            );
          })}
        </Card>
      ))}
    </View>
  );
}

function PlannedMeal({ entry, week, on }: { entry: MealPlanEntry; week: string; on: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { recipe } = entry;
  const details = [formatMinutes(recipe.totalMinutes)]
    .concat(
      recipe.caloriesPerServing === null
        ? []
        : [`${formatCalories(recipe.caloriesPerServing)} por ración`],
    )
    .join(' · ');
  const warnings = [entry.recipeConflicts && CONFLICT, recipe.allergensUncertain && UNCERTAIN];
  const label = [
    `${mealLabels[entry.meal]} del ${formatWeekday(entry.date, on).toLowerCase()}: ${recipe.name}`,
    details,
    ...warnings,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() =>
        router.push({ pathname: '/plan/[id]', params: { id: entry.id, week } })
      }
      style={({ pressed }) => [styles.meal, pressed && { backgroundColor: theme.surfaceSecondary }]}>
      <View style={styles.mealText}>
        <ThemedText type="label" themeColor="textSecondary">
          {mealLabels[entry.meal]}
        </ThemedText>
        <ThemedText type="defaultBold">{recipe.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {details}
        </ThemedText>
        {entry.recipeConflicts && <Badge tone="danger">{CONFLICT}</Badge>}
        {recipe.allergensUncertain && <Badge tone="warning">{UNCERTAIN}</Badge>}
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={16}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

function EmptyMeal({ day, meal, on }: { day: string; meal: MealType; on: string }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mealLabels[meal]} del ${formatWeekday(day, on).toLowerCase()}: añadir receta`}
      onPress={() => router.push({ pathname: '/plan/assign', params: { date: day, meal } })}
      style={({ pressed }) => [styles.meal, pressed && { backgroundColor: theme.surfaceSecondary }]}>
      <View style={styles.mealText}>
        <ThemedText type="label" themeColor="textSecondary">
          {mealLabels[meal]}
        </ThemedText>
        <ThemedText themeColor="textSecondary">Añadir receta</ThemedText>
      </View>
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        size={16}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

function WeekButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: SymbolViewProps['name'];
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.weekButton,
        { borderColor: theme.borderStrong },
        pressed && { backgroundColor: theme.surfaceSecondary },
      ]}>
      <SymbolView name={icon} size={18} tintColor={theme.textPrimary} />
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
    flexGrow: 1,
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
  weekNavigation: {
    gap: Spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  weekTitle: {
    flex: 1,
    textAlign: 'center',
  },
  weekButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  days: {
    gap: Spacing.md,
  },
  day: {
    gap: Spacing.sm,
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 56,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  mealText: {
    flex: 1,
    gap: Spacing.xs,
  },
});
