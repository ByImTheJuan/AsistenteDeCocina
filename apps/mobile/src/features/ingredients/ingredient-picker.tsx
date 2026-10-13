import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { categoryLabel, type Ingredient } from './ingredients-api';
import { useIngredientSearch } from './use-ingredient-search';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/lib/api-error-message';

const SEARCH_DELAY_MS = 300;
// What the API returns at most; a full page means there may be more.
const PAGE_SIZE = 50;

type IngredientPickerProps = {
  title: string;
  selected: Ingredient[];
  /** Ingredients that cannot be chosen here, and why, as shown next to them. */
  unavailable?: { ingredients: Ingredient[]; reason: string };
  onToggle(ingredient: Ingredient): void;
  onClose(): void;
};

/** Searches the catalogue and adds ingredients to a list, or removes them from it. */
export function IngredientPicker({
  title,
  selected,
  unavailable,
  onToggle,
  onClose,
}: IngredientPickerProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const { data: results, error, isFetching, refetch } = useIngredientSearch(search);

  // Waits for a pause in the typing before asking the API.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(text), SEARCH_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [text]);

  const isIn = (ingredients: Ingredient[], { id }: Ingredient) =>
    ingredients.some((ingredient) => ingredient.id === id);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.content}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <TextField
            label="Buscar alimento"
            placeholder="Por ejemplo, tomate"
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          <ScrollView
            style={styles.results}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled">
            {error ? (
              <View style={styles.message}>
                <ThemedText themeColor="danger" accessibilityRole="alert" style={styles.centered}>
                  {apiErrorMessage(error)}
                </ThemedText>
                <PrimaryButton
                  label="Reintentar"
                  variant="secondary"
                  loading={isFetching}
                  onPress={() => void refetch()}
                />
              </View>
            ) : !results ? (
              <ActivityIndicator accessibilityLabel="Buscando alimentos" />
            ) : results.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                No hay ningún alimento que coincida con «{search.trim()}».
              </ThemedText>
            ) : (
              <>
                {results.map((ingredient) => {
                  const checked = isIn(selected, ingredient);
                  const blocked =
                    unavailable !== undefined && isIn(unavailable.ingredients, ingredient);
                  return (
                    <Pressable
                      key={ingredient.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={ingredient.name}
                      accessibilityHint={blocked ? unavailable?.reason : undefined}
                      accessibilityState={{ checked, disabled: blocked }}
                      disabled={blocked}
                      onPress={() => onToggle(ingredient)}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          backgroundColor:
                            theme[checked ? 'backgroundSelected' : 'backgroundElement'],
                        },
                        (pressed || blocked) && styles.dimmed,
                      ]}>
                      <View style={styles.rowText}>
                        <ThemedText>{ingredient.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {blocked ? unavailable?.reason : categoryLabel(ingredient.category)}
                        </ThemedText>
                      </View>
                      {checked && <ThemedText type="smallBold">✓</ThemedText>}
                    </Pressable>
                  );
                })}
                {results.length >= PAGE_SIZE && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                    Hay más alimentos. Escribe para afinar la búsqueda.
                  </ThemedText>
                )}
              </>
            )}
          </ScrollView>

          <PrimaryButton label="Hecho" onPress={onClose} />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    gap: Spacing.two,
  },
  message: {
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: {
    flex: 1,
  },
  dimmed: {
    opacity: 0.5,
  },
});
