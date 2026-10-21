import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFLICT, UNCERTAIN } from './labels';
import type { MealPlanEntry } from './meal-plan-api';
import { mealPlanErrorMessage } from './meal-plan-errors';
import { useMealPlan, useRemoveMealPlanEntry, useSaveMealPlanEntry } from './use-meal-plan';
import { formatWeekday, mealLabels, mealTypes, weekStart, type MealType } from './week';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenState } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DatePickerField } from '@/features/inventory/date-picker-field';
import { calendarDaySchema, today } from '@/features/inventory/expiry';
import { formatCalories, formatMinutes } from '@/features/recipes/recipe-format';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

const mealOptions = mealTypes.map((meal) => ({ value: meal, label: mealLabels[meal] }));

/**
 * One recipe of the plan: opens the recipe, moves it to another day or meal,
 * puts another recipe in its place or removes it from the plan. `week` is the
 * Monday of the week the plan was showing, where the entry is looked up.
 */
export function MealPlanEntryScreen() {
  const { id, week } = useLocalSearchParams<{ id: string; week?: string }>();
  const start = calendarDaySchema.safeParse(week).success ? (week as string) : weekStart(today());
  const { data: plan, isPending, error, refetch, isRefetching } = useMealPlan(start);
  const found = plan?.entries.find((entry) => entry.id === id);
  // Once moved to another week or removed, the entry leaves the cache while
  // the screen is closing; it keeps showing what it had instead of "not found".
  const [lastSeen, setLastSeen] = useState(found);
  if (found && found !== lastSeen) {
    setLastSeen(found);
  }
  const entry = found ?? lastSeen;

  if (entry) {
    return <EntryForm entry={entry} />;
  }

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando tu plan" />;
  }

  if (!plan) {
    return (
      <ScreenState
        kind="error"
        title="No se ha podido cargar tu plan"
        message={mealPlanErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <ScreenState
      kind="empty"
      title="Esta receta ya no está en tu plan"
      message="Puede que la hayas cambiado o eliminado desde otro dispositivo."
    />
  );
}

function EntryForm({ entry }: { entry: MealPlanEntry }) {
  const router = useRouter();
  const save = useSaveMealPlanEntry();
  const remove = useRemoveMealPlanEntry(entry.id);
  // A draft of when; nothing reaches the API until it is saved.
  const [date, setDate] = useState(entry.date);
  const [meal, setMeal] = useState<MealType>(entry.meal);
  const [failure, setFailure] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const isDirty = date !== entry.date || meal !== entry.meal;
  useUnsavedChangesWarning(isDirty && !finished);
  const on = today();
  const { recipe } = entry;

  // Back to the plan once the warning above has been switched off.
  useEffect(() => {
    if (finished) {
      router.back();
    }
  }, [finished, router]);

  async function handleSave() {
    setFailure(null);
    try {
      await save.mutateAsync({ id: entry.id, input: { date, meal, recipeId: recipe.id } });
      setFinished(true);
    } catch (error) {
      setFailure(`${mealPlanErrorMessage(error)} Tus cambios siguen aquí, sin guardar.`);
    }
  }

  async function handleRemove() {
    try {
      await remove.mutateAsync();
      setFinished(true);
    } catch (error) {
      setFailure(mealPlanErrorMessage(error));
    }
  }

  function askToRemove() {
    setFailure(null);
    Alert.alert(
      `¿Quitar ${recipe.name} del plan?`,
      'La receta seguirá en el catálogo y podrás volver a planificarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => void handleRemove() },
      ],
    );
  }

  const details = [formatMinutes(recipe.totalMinutes)]
    .concat(
      recipe.caloriesPerServing === null
        ? []
        : [`${formatCalories(recipe.caloriesPerServing)} por ración`],
    )
    .join(' · ');
  const busy = save.isPending || remove.isPending;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              {recipe.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {`${mealLabels[entry.meal]} del ${formatWeekday(entry.date, on).toLowerCase()}`}
            </ThemedText>
          </View>

          {entry.recipeConflicts && (
            <Notice tone="error" title={CONFLICT}>
              Tiene algo que tus alergias e intolerancias no permiten. Cámbiala por otra receta o
              quítala del plan.
            </Notice>
          )}

          <Card style={styles.section}>
            <ThemedText type="heading" accessibilityRole="header">
              Receta
            </ThemedText>
            <ThemedText themeColor="textSecondary">{details}</ThemedText>
            {recipe.allergensUncertain && <Badge tone="warning">{UNCERTAIN}</Badge>}
            <View style={styles.actions}>
              <View style={styles.action}>
                <PrimaryButton
                  label="Ver receta"
                  variant="secondary"
                  onPress={() =>
                    router.push({ pathname: '/plan/recipe/[id]', params: { id: recipe.id } })
                  }
                />
              </View>
              <View style={styles.action}>
                <PrimaryButton
                  label="Cambiar receta"
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    router.push({
                      pathname: '/plan/assign',
                      params: { date: entry.date, meal: entry.meal, entryId: entry.id },
                    })
                  }
                />
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <ThemedText type="heading" accessibilityRole="header">
              Cuándo
            </ThemedText>
            <DatePickerField
              label="Día"
              clearable={false}
              value={date}
              onChange={(day) => {
                if (day) {
                  setFailure(null);
                  setDate(day);
                }
              }}
            />
            <ThemedText themeColor="textSecondary">{formatWeekday(date, on)}</ThemedText>
            <SegmentedControl
              label="Comida"
              options={mealOptions}
              value={meal}
              onChange={(next) => {
                setFailure(null);
                setMeal(next);
              }}
            />
          </Card>

          <PrimaryButton
            label="Guardar"
            disabled={!isDirty || remove.isPending}
            loading={save.isPending}
            onPress={() => void handleSave()}
          />
          {failure && <Notice tone="error">{failure}</Notice>}

          <PrimaryButton
            label="Quitar del plan"
            variant="danger"
            disabled={save.isPending}
            loading={remove.isPending}
            onPress={askToRemove}
          />
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
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  action: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
