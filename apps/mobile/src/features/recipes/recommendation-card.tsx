import { StyleSheet, View } from 'react-native';

import { formatMinutes, formatServings } from './recipe-format';
import { RecipeImage } from './recipe-image';
import type { RecommendedRecipe } from './recipes-api';
import type { RecommendationLine } from './recommendations';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

/** '45 min · 4 raciones'. */
export function describeTimeAndServings(recipe: RecommendedRecipe): string {
  return `${formatMinutes(recipe.totalMinutes)} · ${formatServings(recipe.servings)}`;
}

/** A recommended recipe, as one card of the deck. */
export function RecommendationCard({
  recipe,
  lines,
}: {
  recipe: RecommendedRecipe;
  /** Why it suits the user, from describeRecommendation. */
  lines: RecommendationLine[];
}) {
  return (
    <Card style={styles.card}>
      <RecipeImage uri={recipe.imageUrl} style={styles.image} />
      <View style={styles.text}>
        <ThemedText type="heading">{recipe.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {describeTimeAndServings(recipe)}
        </ThemedText>
        <ThemedText>{recipe.description}</ThemedText>
      </View>
      <View style={styles.lines}>
        {lines.map(({ text, warning }) =>
          warning ? (
            <Badge key={text} tone="warning">
              {text}
            </Badge>
          ) : (
            <ThemedText key={text} type="small">
              {text}
            </ThemedText>
          ),
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
  },
  text: {
    gap: Spacing.xs,
  },
  lines: {
    gap: Spacing.sm,
  },
});
