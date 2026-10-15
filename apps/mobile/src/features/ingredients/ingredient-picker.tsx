import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { categoryLabel, type Ingredient } from './ingredients-api';
import { useIngredientSearch } from './use-ingredient-search';

import { Notice } from '@/components/notice';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/lib/api-error-message';

const SEARCH_DELAY_MS = 300;
// What the API returns at most; a full page means there may be more.
const PAGE_SIZE = 50;

type IngredientPickerProps = {
  title: string;
  onClose(): void;
} & (
  | {
      /** Builds a list: each ingredient is added or removed, and "Hecho" closes. */
      mode?: 'multiple';
      selected: Ingredient[];
      /** Ingredients that cannot be chosen here, and why, as shown next to them. */
      unavailable?: { ingredients: Ingredient[]; reason: string };
      onToggle(ingredient: Ingredient): void;
    }
  | {
      /** Chooses one ingredient; the caller closes the picker. */
      mode: 'single';
      onSelect(ingredient: Ingredient): void;
    }
);

/**
 * Searches the catalogue, by name or synonym. Adds ingredients to a list, or
 * removes them from it, or chooses one.
 */
export function IngredientPicker(props: IngredientPickerProps) {
  const { title, onClose } = props;
  const selected = props.mode === 'single' ? [] : props.selected;
  const unavailable = props.mode === 'single' ? undefined : props.unavailable;
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
          <ThemedText type="title">{title}</ThemedText>
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
                <Notice tone="error">{apiErrorMessage(error)}</Notice>
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
                      accessibilityRole={props.mode === 'single' ? 'button' : 'checkbox'}
                      accessibilityLabel={ingredient.name}
                      accessibilityHint={blocked ? unavailable?.reason : undefined}
                      accessibilityState={
                        props.mode === 'single' ? undefined : { checked, disabled: blocked }
                      }
                      disabled={blocked}
                      onPress={() =>
                        props.mode === 'single'
                          ? props.onSelect(ingredient)
                          : props.onToggle(ingredient)
                      }
                      style={({ pressed }) => [
                        styles.row,
                        {
                          backgroundColor:
                            theme[
                              blocked
                                ? 'disabledSurface'
                                : checked || pressed
                                  ? 'surfaceSecondary'
                                  : 'surface'
                            ],
                          borderColor:
                            theme[
                              blocked ? 'disabledBorder' : checked ? 'textPrimary' : 'borderStrong'
                            ],
                        },
                      ]}>
                      <View style={styles.rowText}>
                        <ThemedText themeColor={blocked ? 'disabledText' : 'textPrimary'}>
                          {ingredient.name}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          themeColor={blocked ? 'disabledText' : 'textSecondary'}>
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

          {props.mode === 'single' ? (
            <PrimaryButton label="Cancelar" variant="secondary" onPress={onClose} />
          ) : (
            <PrimaryButton label="Hecho" onPress={onClose} />
          )}
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
    gap: Spacing.lg,
    padding: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    gap: Spacing.sm,
  },
  message: {
    gap: Spacing.lg,
  },
  centered: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  rowText: {
    flex: 1,
  },
});
