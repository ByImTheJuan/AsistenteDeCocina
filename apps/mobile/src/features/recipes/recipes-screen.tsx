import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinutes, formatRating, joinNames } from './recipe-format';
import { RecipeImage } from './recipe-image';
import type { RecipeSummary } from './recipes-api';
import { recipesErrorMessage } from './recipes-errors';
import { useRecipeCatalogue } from './use-recipes';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const UNCERTAIN = 'Revisa los alérgenos';

function hiddenMessage(count: number): string {
  return count === 1
    ? 'Ocultamos 1 receta que no es apta según tus alergias e intolerancias.'
    : `Ocultamos ${count} recetas que no son aptas según tus alergias e intolerancias.`;
}

/**
 * The recipe catalogue, without the recipes that clash with the user's
 * restrictions; each one opens to its detail.
 */
export function RecipesScreen() {
  const { data: catalogue, isPending, error, refetch, isRefetching } = useRecipeCatalogue();

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando las recetas" />;
  }

  if (!catalogue) {
    return (
      <ScreenState
        kind="error"
        title="No se han podido cargar las recetas"
        message={recipesErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  }

  if (catalogue.recipes.length === 0) {
    return (
      <ScreenState
        kind="empty"
        title="No hay recetas aptas para ti"
        message={
          catalogue.hiddenCount > 0
            ? 'Todas las recetas del catálogo contienen algo de tus alergias e intolerancias.'
            : 'El catálogo de recetas está vacío por ahora.'
        }
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Recetas
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Platos que puedes preparar. Toca una receta para ver sus ingredientes y pasos.
            </ThemedText>
          </View>

          {catalogue.hiddenCount > 0 && (
            <Notice tone="warning">{hiddenMessage(catalogue.hiddenCount)}</Notice>
          )}

          <View style={styles.list}>
            {catalogue.recipes.map((recipe) => (
              <RecipeRow key={recipe.id} recipe={recipe} />
            ))}
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function RecipeRow({ recipe }: { recipe: RecipeSummary }) {
  const router = useRouter();
  const theme = useTheme();
  const minutes = formatMinutes(recipe.totalMinutes);
  const mainIngredients = joinNames(recipe.mainIngredients.map(({ name }) => name));
  const rating = formatRating(recipe.rating);
  const label = [recipe.name, minutes, mainIngredients, rating]
    .concat(recipe.allergensUncertain ? [UNCERTAIN] : [])
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: recipe.id } })}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && { backgroundColor: theme.surfaceSecondary }]}>
          <RecipeImage uri={recipe.imageUrl} style={styles.thumbnail} />
          <View style={styles.rowText}>
            <ThemedText type="defaultBold">{recipe.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {mainIngredients}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {`${minutes} · ${rating}`}
            </ThemedText>
            {recipe.allergensUncertain && <Badge tone="warning">{UNCERTAIN}</Badge>}
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
  list: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 64,
  },
  thumbnail: {
    width: 64,
    height: 64,
  },
  rowText: {
    flex: 1,
    gap: Spacing.xs,
  },
});
