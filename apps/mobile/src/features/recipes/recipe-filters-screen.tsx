import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatCalories } from './recipe-format';
import {
  caloriesOptions,
  dietLabels,
  minutesOptions,
  noFilters,
  sortLabels,
  type FilterDiet,
  type RecipeFilters,
  type RecipeSort,
} from './recipe-filters';
import { useRecipeFilters } from './recipe-filters-context';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNutritionGoals } from '@/features/nutrition-goals/use-nutrition-goals';

const ANY = 'any';

// SegmentedControl works with text values; numbers and null go through these.
const fromOption = (value: string) => (value === ANY ? null : Number(value));
const toOption = (value: number | null) => (value === null ? ANY : String(value));

/**
 * The filters of the recipe lists, edited as a draft: "Ver resultados"
 * applies them and goes back; "Quitar filtros" clears the draft.
 */
export function RecipeFiltersScreen() {
  const router = useRouter();
  const { filters, setFilters } = useRecipeFilters();
  const [draft, setDraft] = useState<RecipeFilters>(filters);
  const { data: goals } = useNutritionGoals();
  const update = (change: Partial<RecipeFilters>) => setDraft((current) => ({ ...current, ...change }));

  // The goal per meal, as one more limit, when the user has it switched on.
  const mealGoal = goals?.mealCalories?.enabled ? goals.mealCalories.value : null;
  const calorieLimits: number[] = [...caloriesOptions];
  // Also a limit chosen before that is no longer offered (a goal switched off).
  for (const limit of [mealGoal, draft.maxCalories]) {
    if (limit !== null && !calorieLimits.includes(limit)) calorieLimits.push(limit);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Card>
            <SegmentedControl
              label="Tiempo de preparación"
              options={[
                { value: ANY, label: 'Cualquiera' },
                ...minutesOptions.map((minutes) => ({
                  value: String(minutes),
                  label: `Hasta ${minutes} min`,
                })),
              ]}
              value={toOption(draft.maxMinutes)}
              onChange={(value) => update({ maxMinutes: fromOption(value) })}
            />
          </Card>

          <Card>
            <SegmentedControl
              label="Calorías por ración"
              options={[
                { value: ANY, label: 'Cualquiera' },
                ...calorieLimits.map((calories) => ({
                  value: String(calories),
                  label:
                    calories === mealGoal
                      ? `Mi objetivo por comida (${formatCalories(calories)})`
                      : `Hasta ${formatCalories(calories)}`,
                })),
              ]}
              value={toOption(draft.maxCalories)}
              onChange={(value) => update({ maxCalories: fromOption(value) })}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Son estimaciones. Con un límite de calorías no se muestran las recetas sin datos
              suficientes para calcularlas.
            </ThemedText>
          </Card>

          <Card>
            <SegmentedControl<FilterDiet | typeof ANY>
              label="Dieta"
              options={[
                { value: ANY, label: 'Cualquiera' },
                ...(Object.keys(dietLabels) as FilterDiet[]).map((diet) => ({
                  value: diet,
                  label: dietLabels[diet],
                })),
              ]}
              value={draft.diet ?? ANY}
              onChange={(value) => update({ diet: value === ANY ? null : value })}
            />
          </Card>

          <Card>
            <SegmentedControl<RecipeSort>
              label="Ordenar por"
              options={(Object.keys(sortLabels) as RecipeSort[]).map((sort) => ({
                value: sort,
                label: sortLabels[sort],
              }))}
              value={draft.sort}
              onChange={(sort) => update({ sort })}
            />
          </Card>

          <View style={styles.actions}>
            <PrimaryButton
              label="Ver resultados"
              onPress={() => {
                setFilters(draft);
                router.back();
              }}
            />
            <PrimaryButton
              variant="secondary"
              label="Quitar filtros"
              onPress={() => setDraft(noFilters)}
            />
          </View>
        </View>
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxWidth: MaxContentWidth,
  },
  actions: {
    gap: Spacing.md,
  },
});
