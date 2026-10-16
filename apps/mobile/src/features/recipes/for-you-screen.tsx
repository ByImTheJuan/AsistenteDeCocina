import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { describeTimeAndServings, RecommendationCard } from './recommendation-card';
import {
  describeLeftOut,
  describeRecommendation,
  ENOUGH_RECOMMENDATIONS,
} from './recommendations';
import type { RecommendedRecipe } from './recipes-api';
import { recipesErrorMessage } from './recipes-errors';
import { useRecommendations } from './use-recipes';

import { Notice } from '@/components/notice';
import { ScreenState } from '@/components/screen-state';
import { SwipeDeck } from '@/components/swipe-deck';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { today } from '@/features/inventory/expiry';

const labels = { reject: 'No me interesa', accept: 'Ver receta' };

/**
 * The recipes recommended for the user, one card at a time: swiping to the
 * right opens the recipe, to the left says it is not of interest. A recipe
 * seen once is not offered again while the app is open; nothing is saved.
 */
export function ForYouScreen() {
  const router = useRouter();
  const { data, isPending, error, refetch, isRefetching } = useRecommendations();
  // Kept while the tab is mounted: for this session of the app only.
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  const markSeen = (recipe: RecommendedRecipe) =>
    setSeen((current) => new Set(current).add(recipe.id));
  const goToCatalogue = { label: 'Ver el catálogo', onPress: () => router.navigate('/recipes') };

  let content;
  if (isPending) {
    content = <ScreenState kind="loading" label="Buscando recetas para ti" />;
  } else if (!data) {
    content = (
      <ScreenState
        kind="error"
        title="No se han podido cargar las recomendaciones"
        message={recipesErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  } else if (data.recipes.length === 0) {
    content = (
      <ScreenState
        kind="empty"
        title="No hay recetas que encajen con tu perfil"
        message={[
          describeLeftOut(data.hiddenCount, data.excludedCount),
          'Puedes revisar tu perfil o explorar el catálogo.',
        ]
          .filter((part) => part !== null)
          .join(' ')}
        action={goToCatalogue}
      />
    );
  } else {
    const remaining = data.recipes.filter(({ id }) => !seen.has(id));
    const on = today();
    content =
      remaining.length === 0 ? (
        <ScreenState
          kind="empty"
          title="No hay más recomendaciones"
          message="Ya has visto todas las recetas que te recomendamos por ahora."
          action={goToCatalogue}
        />
      ) : (
        <>
          {data.recipes.length < ENOUGH_RECOMMENDATIONS && (
            <Notice tone="warning">
              {[
                data.recipes.length === 1
                  ? 'Solo hemos encontrado 1 receta que encaje con tu perfil.'
                  : `Solo hemos encontrado ${data.recipes.length} recetas que encajen con tu perfil.`,
                describeLeftOut(data.hiddenCount, data.excludedCount),
              ]
                .filter((part) => part !== null)
                .join(' ')}
            </Notice>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {remaining.length === 1
              ? 'Queda 1 receta'
              : `Quedan ${remaining.length} recetas`}
          </ThemedText>
          <SwipeDeck
            items={remaining}
            keyOf={({ id }) => id}
            labels={labels}
            labelOf={(recipe) =>
              [
                recipe.name,
                describeTimeAndServings(recipe),
                ...describeRecommendation(recipe, on).map(({ text }) => text),
              ].join(', ')
            }
            renderCard={(recipe) => (
              <RecommendationCard recipe={recipe} lines={describeRecommendation(recipe, on)} />
            )}
            onReject={markSeen}
            onAccept={(recipe) => {
              markSeen(recipe);
              router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
            }}
          />
        </>
      );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Para ti
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Recetas elegidas según tu perfil y tu despensa. Desliza a la derecha para ver la
              receta o a la izquierda si no te interesa.
            </ThemedText>
          </View>
          {content}
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
    flexGrow: 1,
    alignSelf: 'stretch',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: BottomTabInset + Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.sm,
  },
});
