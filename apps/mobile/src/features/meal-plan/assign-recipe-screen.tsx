import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UNCERTAIN } from './labels';
import { mealPlanErrorMessage } from './meal-plan-errors';
import { useSaveMealPlanEntry } from './use-meal-plan';
import { formatWeekday, mealLabels, mealTypeSchema, type MealType } from './week';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { ScreenState } from '@/components/screen-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { calendarDaySchema, today } from '@/features/inventory/expiry';
import type { RecipeSummary } from '@/features/recipes/recipes-api';
import { formatCalories, formatMinutes, joinNames } from '@/features/recipes/recipe-format';
import { noFilters, toQuery } from '@/features/recipes/recipe-filters';
import { recipesErrorMessage } from '@/features/recipes/recipes-errors';
import { useRecipeCatalogue } from '@/features/recipes/use-recipes';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

/** Typing waits this long before searching. */
const SEARCH_DELAY_MS = 300;

type Params = { date?: string; meal?: string; entryId?: string };

/**
 * Chooses the recipe for a meal of a day: plans it, or with `entryId` puts it
 * in place of the one planned. Only the recipes apt for the user's
 * restrictions are offered.
 */
export function AssignRecipeScreen() {
  const params = useLocalSearchParams<Params>();
  const date = calendarDaySchema.safeParse(params.date);
  const meal = mealTypeSchema.safeParse(params.meal);

  if (!date.success || !meal.success) {
    return (
      <ScreenState
        kind="empty"
        title="No se ha encontrado esa comida"
        message="Vuelve al plan y elige un día y una comida."
      />
    );
  }
  return <RecipeChooser date={date.data} meal={meal.data} entryId={params.entryId} />;
}

function RecipeChooser({
  date,
  meal,
  entryId,
}: {
  date: string;
  meal: MealType;
  entryId?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const query = toQuery(useDebouncedValue(search, SEARCH_DELAY_MS), noFilters);
  const catalogue = useRecipeCatalogue(query);
  const save = useSaveMealPlanEntry();
  const [failure, setFailure] = useState<string | null>(null);
  const on = today();

  async function choose(recipe: RecipeSummary) {
    setFailure(null);
    try {
      await save.mutateAsync({ id: entryId, input: { date, meal, recipeId: recipe.id } });
      router.back();
    } catch (error) {
      setFailure(mealPlanErrorMessage(error));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title" accessibilityRole="header">
                {`${mealLabels[meal]} del ${formatWeekday(date, on).toLowerCase()}`}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {entryId
                  ? 'Elige la receta que quieres poner en su lugar.'
                  : 'Elige la receta que quieres preparar.'}{' '}
                Solo aparecen las recetas aptas para tus alergias e intolerancias.
              </ThemedText>
            </View>

            <TextField
              label="Buscar recetas"
              placeholder="Nombre o ingrediente"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
            />

            {failure && <Notice tone="error">{failure}</Notice>}

            {catalogue.data ? (
              catalogue.data.recipes.length === 0 ? (
                <ScreenState
                  kind="empty"
                  title="No hay recetas que coincidan"
                  message="Prueba con otra búsqueda."
                />
              ) : (
                <View style={styles.list}>
                  {catalogue.data.recipes.map((recipe) => (
                    <RecipeOption
                      key={recipe.id}
                      recipe={recipe}
                      disabled={save.isPending}
                      onChoose={() => void choose(recipe)}
                    />
                  ))}
                </View>
              )
            ) : catalogue.isPending ? (
              <ScreenState kind="loading" label="Cargando las recetas" />
            ) : (
              <ScreenState
                kind="error"
                title="No se han podido cargar las recetas"
                message={recipesErrorMessage(catalogue.error)}
                retrying={catalogue.isRefetching}
                onRetry={() => void catalogue.refetch()}
              />
            )}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function RecipeOption({
  recipe,
  disabled,
  onChoose,
}: {
  recipe: RecipeSummary;
  disabled: boolean;
  onChoose(): void;
}) {
  const theme = useTheme();
  const minutes = formatMinutes(recipe.totalMinutes);
  const calories =
    recipe.caloriesPerServing === null
      ? null
      : `${formatCalories(recipe.caloriesPerServing)} por ración`;
  const mainIngredients = joinNames(recipe.mainIngredients.map(({ name }) => name));
  const label = [recipe.name, minutes, calories, mainIngredients]
    .concat(recipe.allergensUncertain ? [UNCERTAIN] : [])
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onChoose}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.rowText}>
            <ThemedText type="defaultBold">{recipe.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {mainIngredients}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[minutes, calories].filter(Boolean).join(' · ')}
            </ThemedText>
            {recipe.allergensUncertain && <Badge tone="warning">{UNCERTAIN}</Badge>}
          </View>
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' }}
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
    flexGrow: 1,
    alignSelf: 'stretch',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 64,
  },
  rowText: {
    flex: 1,
    gap: Spacing.xs,
  },
});
