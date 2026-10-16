import { useLocalSearchParams } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  describeAmount,
  describeConflicts,
  describeGoalFit,
  exceedsGoal,
  formatCalories,
  formatMinutes,
  formatProtein,
  formatRating,
  formatServings,
  hasConflicts,
  joinNames,
} from './recipe-format';
import { RecipeImage } from './recipe-image';
import type { GoalFit, RecipeDetail, RecipeNutrition } from './recipes-api';
import { recipesErrorMessage } from './recipes-errors';
import { useRecipe } from './use-recipes';

import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';

// The servings the quantities can be worked out for.
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

/**
 * A recipe with its ingredients and quantities for the servings chosen, its
 * estimated nutrition against the user's goals, its steps and its reviews.
 */
export function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isPending, error, refetch, isRefetching } = useRecipe(id);

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando la receta" />;
  }

  if (!recipe) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <ScreenState
          kind="empty"
          title="Esta receta ya no está disponible"
          message="Puede que se haya retirado del catálogo."
        />
      );
    }
    return (
      <ScreenState
        kind="error"
        title="No se ha podido cargar la receta"
        message={recipesErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  }

  return <Recipe recipe={recipe} />;
}

function Recipe({ recipe }: { recipe: RecipeDetail }) {
  const theme = useTheme();
  // Only for this visit: the recipe keeps its own servings.
  const [servings, setServings] = useState(recipe.servings);
  const scale = servings / recipe.servings;
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.content}>
          {recipe.imageUrl && <RecipeImage uri={recipe.imageUrl} style={styles.image} />}

          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              {recipe.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
            <View style={styles.facts}>
              <Fact icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}>
                {formatMinutes(recipe.totalMinutes)}
              </Fact>
              <Fact icon={{ ios: 'person.2', android: 'group', web: 'group' }}>
                {formatServings(recipe.servings)}
              </Fact>
            </View>
          </View>

          {hasConflicts(recipe.safety) && (
            <Notice tone="error" title="No es apta para ti">
              {`Contiene ${describeConflicts(recipe.safety)}, que están en tus alergias e intolerancias.`}
            </Notice>
          )}
          {recipe.safety.allergensUncertain && (
            <Notice tone="warning" title="Revisa los alérgenos">
              Algún ingrediente elaborado puede llevar alérgenos distintos según la marca. Comprueba
              su etiqueta antes de prepararla.
            </Notice>
          )}

          <Card style={styles.card}>
            <ThemedText type="heading" accessibilityRole="header">
              Ingredientes
            </ThemedText>
            <ServingsStepper
              value={servings}
              onChange={setServings}
              max={Math.max(MAX_SERVINGS, recipe.servings)}
            />
            {recipe.ingredients.map((line, index) => (
              <View
                key={index}
                accessible
                accessibilityLabel={`${line.ingredient.name}: ${describeAmount(line, scale)}`}
                style={[
                  styles.ingredient,
                  index > 0 && [styles.separated, { borderTopColor: theme.border }],
                ]}>
                <ThemedText type="defaultBold" style={styles.ingredientName}>
                  {line.ingredient.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.amount}>
                  {describeAmount(line, scale)}
                </ThemedText>
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              La información de alérgenos es orientativa: comprueba siempre las etiquetas.
            </ThemedText>
          </Card>

          <NutritionCard nutrition={recipe.nutrition} goals={recipe.goals} />

          <Card style={styles.card}>
            <ThemedText type="heading" accessibilityRole="header">
              Preparación
            </ThemedText>
            {recipe.steps.map((step, index) => (
              <View
                key={index}
                accessible
                accessibilityLabel={`Paso ${index + 1}: ${step}`}
                style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" themeColor="onPrimary">
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText style={styles.stepText}>{step}</ThemedText>
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <ThemedText type="heading" accessibilityRole="header">
              Valoraciones y reseñas
            </ThemedText>
            <Fact icon={{ ios: 'star', android: 'star', web: 'star' }}>
              {formatRating(recipe.rating)}
            </Fact>
            <ThemedText themeColor="textSecondary">Todavía no hay reseñas de esta receta.</ThemedText>
          </Card>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

/** Chooses how many servings the quantities are for. */
function ServingsStepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange(servings: number): void;
  max: number;
}) {
  const label = formatServings(value);
  const decrement = () => value > MIN_SERVINGS && onChange(value - 1);
  const increment = () => value < max && onChange(value + 1);
  return (
    <View style={styles.stepper}>
      <ThemedText
        accessibilityLabel={`Raciones: ${label}`}
        accessibilityLiveRegion="polite"
        style={styles.stepperLabel}>
        {`Para ${label}`}
      </ThemedText>
      <StepButton
        label="Menos raciones"
        icon={{ ios: 'minus', android: 'remove', web: 'remove' }}
        disabled={value <= MIN_SERVINGS}
        onPress={decrement}
      />
      <StepButton
        label="Más raciones"
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        disabled={value >= max}
        onPress={increment}
      />
    </View>
  );
}

function StepButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: SymbolViewProps['name'];
  disabled: boolean;
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        {
          backgroundColor: disabled
            ? theme.disabledSurface
            : pressed
              ? theme.surfaceSecondary
              : theme.surface,
          borderColor: disabled ? theme.disabledBorder : theme.borderStrong,
        },
      ]}>
      <SymbolView
        name={icon}
        size={18}
        tintColor={disabled ? theme.disabledText : theme.textPrimary}
      />
    </Pressable>
  );
}

/** Estimated calories and protein of a serving, and how they fit the goals. */
function NutritionCard({ nutrition, goals }: { nutrition: RecipeNutrition; goals: GoalFit[] }) {
  const { calories, protein } = nutrition.perServing;
  const missing = joinNames(nutrition.missingIngredients.map(({ name }) => name));
  const unavailable = `No disponible: faltan datos de ${missing}`;
  return (
    <Card style={styles.card}>
      <ThemedText type="heading" accessibilityRole="header">
        Información nutricional
      </ThemedText>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {nutrition.estimated ? 'Por ración (estimación)' : 'Por ración'}
      </ThemedText>
      <View style={styles.nutrients}>
        <Nutrient
          name="Calorías"
          value={calories === null ? unavailable : formatCalories(calories)}
        />
        <Nutrient
          name="Proteínas"
          value={protein === null ? unavailable : formatProtein(protein)}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {nutrition.excludesToTaste
          ? 'Calculada con valores medios de los ingredientes, sin contar los que van al gusto.'
          : 'Calculada con valores medios de los ingredientes.'}
      </ThemedText>

      <ThemedText type="defaultBold">Frente a tus objetivos</ThemedText>
      {goals.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Activa tus objetivos nutricionales en Perfil para comparar la receta con ellos.
        </ThemedText>
      ) : (
        goals.map((fit) =>
          exceedsGoal(fit) ? (
            <Notice key={fit.kind} tone="warning">
              {describeGoalFit(fit)}
            </Notice>
          ) : (
            <GoalLine key={fit.kind} fit={fit} />
          ),
        )
      )}
    </Card>
  );
}

function Nutrient({ name, value }: { name: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${name}: ${value}`} style={styles.nutrient}>
      <ThemedText type="small" themeColor="textSecondary">
        {name}
      </ThemedText>
      <ThemedText type="defaultBold">{value}</ThemedText>
    </View>
  );
}

function GoalLine({ fit }: { fit: GoalFit }) {
  const theme = useTheme();
  return (
    <View style={styles.goal}>
      <SymbolView
        name={
          !fit.comparable
            ? { ios: 'questionmark.circle', android: 'help', web: 'help' }
            : fit.kind === 'MEAL_CALORIES'
              ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
              : { ios: 'chart.pie', android: 'pie_chart', web: 'pie_chart' }
        }
        size={18}
        tintColor={theme.textSecondary}
      />
      <ThemedText style={styles.goalText}>{describeGoalFit(fit)}</ThemedText>
    </View>
  );
}

function Fact({ icon, children }: { icon: SymbolViewProps['name']; children: string }) {
  const theme = useTheme();
  return (
    <View style={styles.fact}>
      <SymbolView name={icon} size={16} tintColor={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {children}
      </ThemedText>
    </View>
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
    paddingVertical: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  image: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
  },
  header: {
    gap: Spacing.sm,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
    rowGap: Spacing.xs,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  card: {
    gap: Spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperLabel: {
    flex: 1,
  },
  stepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  nutrients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  nutrient: {
    flexGrow: 1,
    flexBasis: 140,
    gap: Spacing.xs,
  },
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalText: {
    flex: 1,
  },
  ingredient: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: Spacing.md,
  },
  separated: {
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ingredientName: {
    flexShrink: 1,
  },
  amount: {
    flexShrink: 1,
    textAlign: 'right',
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepNumber: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 28,
    borderRadius: Radius.lg,
  },
  stepText: {
    flex: 1,
  },
});
