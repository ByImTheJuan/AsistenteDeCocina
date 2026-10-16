import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  describePantry,
  describeSoonest,
  groupPantryRecipes,
  type PantryLine,
} from './pantry-recipes';
import { activeFilterCount, describeFilters, toQuery } from './recipe-filters';
import { useRecipeFilters } from './recipe-filters-context';
import { formatCalories, formatMinutes, formatRating, joinNames } from './recipe-format';
import { RecipeImage } from './recipe-image';
import type { RecipeSummary } from './recipes-api';
import { recipesErrorMessage } from './recipes-errors';
import { usePantryRecipes, useRecipeCatalogue } from './use-recipes';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenState } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { today } from '@/features/inventory/expiry';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

const UNCERTAIN = 'Revisa los alérgenos';

type RecipesView = 'all' | 'pantry';
const recipesViews: { value: RecipesView; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pantry', label: 'Con mi despensa' },
];

/** Typing waits this long before searching. */
const SEARCH_DELAY_MS = 300;

function hiddenMessage(count: number): string {
  return count === 1
    ? 'Ocultamos 1 receta que no es apta según tus alergias e intolerancias.'
    : `Ocultamos ${count} recetas que no son aptas según tus alergias e intolerancias.`;
}

/**
 * The recipe catalogue, without the recipes that clash with the user's
 * restrictions, or the recipes worth cooking with what there is at home. Both
 * can be searched and filtered. Each recipe opens to its detail.
 */
export function RecipesScreen() {
  const router = useRouter();
  const [view, setView] = useState<RecipesView>('all');
  const { search, setSearch, filters, clear } = useRecipeFilters();
  const query = toQuery(useDebouncedValue(search, SEARCH_DELAY_MS), filters);
  const filterCount = activeFilterCount(filters);
  // With nothing found, the way back to every apt recipe.
  const noMatches = query === '' ? null : <NoMatches onClear={clear} />;
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Recetas
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {view === 'all'
                ? 'Platos que puedes preparar. Toca una receta para ver sus ingredientes y pasos.'
                : 'Recetas que aprovechan lo que tienes en Mi despensa.'}
            </ThemedText>
          </View>

          <SegmentedControl
            label="Ver"
            options={recipesViews}
            value={view}
            onChange={(next) => setView(next)}
          />

          <View style={styles.filters}>
            <TextField
              label="Buscar recetas"
              placeholder="Nombre o ingrediente"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {filterCount > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {`Filtros: ${describeFilters(filters)}`}
              </ThemedText>
            )}
            <View style={styles.filterButtons}>
              <View style={styles.filterButton}>
                <PrimaryButton
                  variant="secondary"
                  label={filterCount > 0 ? `Filtros (${filterCount})` : 'Filtros'}
                  onPress={() => router.push('/recipes/filters')}
                />
              </View>
              {(filterCount > 0 || search.trim() !== '') && (
                <View style={styles.filterButton}>
                  <PrimaryButton variant="secondary" label="Quitar filtros" onPress={clear} />
                </View>
              )}
            </View>
          </View>

          {view === 'all' ? (
            <AllRecipes query={query} noMatches={noMatches} />
          ) : (
            <PantryRecipes query={query} noMatches={noMatches} onShowAll={() => setView('all')} />
          )}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function NoMatches({ onClear }: { onClear(): void }) {
  return (
    <ScreenState
      kind="empty"
      title="No hay recetas que coincidan"
      message="Prueba con otra búsqueda o quita los filtros."
      action={{ label: 'Quitar filtros', onPress: onClear }}
    />
  );
}

type ListProps = {
  /** The search and filters for the API; '' for none. */
  query: string;
  /** Shown when the search or filters leave nothing; null without them. */
  noMatches: ReactNode;
};

function AllRecipes({ query, noMatches }: ListProps) {
  const { data: catalogue, isPending, error, refetch, isRefetching } = useRecipeCatalogue(query);

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

  if (catalogue.recipes.length === 0 && noMatches) {
    return noMatches;
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
    <>
      {catalogue.hiddenCount > 0 && (
        <Notice tone="warning">{hiddenMessage(catalogue.hiddenCount)}</Notice>
      )}
      <View style={styles.list}>
        {catalogue.recipes.map((recipe) => (
          <RecipeRow key={recipe.id} recipe={recipe} />
        ))}
      </View>
    </>
  );
}

function PantryRecipes({ query, noMatches, onShowAll }: ListProps & { onShowAll(): void }) {
  const { data, isPending, error, refetch, isRefetching } = usePantryRecipes(query);

  if (isPending) {
    return <ScreenState kind="loading" label="Buscando recetas para tu despensa" />;
  }

  if (!data) {
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

  const showAll = { label: 'Ver todas las recetas', onPress: onShowAll };
  if (data.inventoryEmpty) {
    return (
      <ScreenState
        kind="empty"
        title="Tu despensa está vacía"
        message="Añade alimentos a Mi despensa para ver qué puedes cocinar con ellos."
        action={showAll}
      />
    );
  }

  // Expiry depends on the day it is for the user, so it is worked out here.
  const on = today();
  const { expiring, ready, almost } = groupPantryRecipes(data.recipes, on);
  if (expiring.length + ready.length + almost.length === 0 && noMatches) {
    return noMatches;
  }
  if (expiring.length + ready.length + almost.length === 0) {
    return (
      <ScreenState
        kind="empty"
        title="Todavía no hay recetas para tu despensa"
        message="Ninguna receta aprovecha bien lo que tienes. Añade más alimentos a Mi despensa o explora todas las recetas."
        action={showAll}
      />
    );
  }

  return (
    <>
      <Notice tone="warning">
        Revisa que los alimentos estén en buen estado antes de cocinar: las sugerencias se basan en
        las fechas que registraste.
      </Notice>
      {data.hiddenCount > 0 && <Notice tone="warning">{hiddenMessage(data.hiddenCount)}</Notice>}

      {expiring.length > 0 && (
        <Section
          title="Aprovecha lo que caduca pronto"
          description="Recetas con alimentos que caducan en los próximos días o ya han pasado su fecha.">
          {expiring.map(({ recipe, soonest }) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              highlight={describeSoonest(soonest, on)}
              lines={describePantry(recipe.pantry)}
            />
          ))}
        </Section>
      )}

      {ready.length > 0 && (
        <Section
          title="Puedes prepararlas"
          description="Tienes todo lo que se mide en la receta.">
          {ready.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} lines={describePantry(recipe.pantry)} />
          ))}
        </Section>
      )}

      {almost.length > 0 && (
        <Section
          title="Te falta poco"
          description="Primero las que necesitan menos ingredientes que no tienes.">
          {almost.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} lines={describePantry(recipe.pantry)} />
          ))}
        </Section>
      )}
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.list}>
      <View style={styles.sectionHeader}>
        <ThemedText type="heading" accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

function RecipeRow({
  recipe,
  highlight,
  lines = [],
}: {
  recipe: RecipeSummary;
  /** Shown as a warning label: what the recipe uses up that expires soon. */
  highlight?: string;
  /** What the recipe needs to know about the pantry. */
  lines?: PantryLine[];
}) {
  const router = useRouter();
  const theme = useTheme();
  const minutes = formatMinutes(recipe.totalMinutes);
  const mainIngredients = joinNames(recipe.mainIngredients.map(({ name }) => name));
  const rating = formatRating(recipe.rating);
  const calories =
    recipe.caloriesPerServing === null ? null : formatCalories(recipe.caloriesPerServing);
  const label = [recipe.name, minutes]
    .concat(calories ? [`${calories} por ración`] : [])
    .concat([mainIngredients, rating])
    .concat(recipe.allergensUncertain ? [UNCERTAIN] : [])
    .concat(highlight ? [highlight] : [])
    .concat(lines.map(({ text }) => text))
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
              {[minutes, calories, rating].filter(Boolean).join(' · ')}
            </ThemedText>
            {recipe.allergensUncertain && <Badge tone="warning">{UNCERTAIN}</Badge>}
            {highlight && <Badge tone="warning">{highlight}</Badge>}
            {lines.map(({ text, danger }) =>
              danger ? (
                <Badge key={text} tone="danger">
                  {text}
                </Badge>
              ) : (
                <ThemedText key={text} type="small">
                  {text}
                </ThemedText>
              ),
            )}
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
  filters: {
    gap: Spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  filterButton: {
    flexGrow: 1,
    flexBasis: 140,
  },
  list: {
    gap: Spacing.md,
  },
  sectionHeader: {
    gap: Spacing.xs,
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
