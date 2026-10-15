import { useLocalSearchParams } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  describeAmount,
  describeConflicts,
  formatMinutes,
  formatRating,
  formatServings,
  hasConflicts,
} from './recipe-format';
import { RecipeImage } from './recipe-image';
import type { RecipeDetail } from './recipes-api';
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

/** A recipe with its ingredients, quantities and steps. */
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
              <Fact icon={{ ios: 'star', android: 'star', web: 'star' }}>
                {formatRating(recipe.rating)}
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
            <ThemedText type="small" themeColor="textSecondary">
              {`Para ${formatServings(recipe.servings)}.`}
            </ThemedText>
            {recipe.ingredients.map((line, index) => (
              <View
                key={index}
                accessible
                accessibilityLabel={`${line.ingredient.name}: ${describeAmount(line)}`}
                style={[
                  styles.ingredient,
                  index > 0 && [styles.separated, { borderTopColor: theme.border }],
                ]}>
                <ThemedText type="defaultBold" style={styles.ingredientName}>
                  {line.ingredient.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.amount}>
                  {describeAmount(line)}
                </ThemedText>
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              La información de alérgenos es orientativa: comprueba siempre las etiquetas.
            </ThemedText>
          </Card>

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
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
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
