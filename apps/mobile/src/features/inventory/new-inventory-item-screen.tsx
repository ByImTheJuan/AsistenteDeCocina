import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { inventoryErrorMessage } from './inventory-errors';
import { quantityFormSchema, toQuantity, type QuantityForm } from './inventory-item-form';
import { QuantityFields } from './quantity-fields';
import { useAddInventoryItem } from './use-inventory';

import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { IngredientPicker } from '@/features/ingredients/ingredient-picker';
import { categoryLabel, type Ingredient } from '@/features/ingredients/ingredients-api';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

/** Chooses a food from the catalogue and adds it with its quantity. */
export function NewInventoryItemScreen() {
  const router = useRouter();
  const add = useAddInventoryItem();
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [picking, setPicking] = useState(false);
  const { control, handleSubmit, setValue } = useForm<QuantityForm>({
    resolver: zodResolver(quantityFormSchema),
    defaultValues: { quantity: '', unit: 'PIECE' },
  });
  const { isDirty } = useFormState({ control });
  const [failure, setFailure] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  useUnsavedChangesWarning((isDirty || ingredient !== null) && !added);

  // Back to the inventory once the warning above has been switched off.
  useEffect(() => {
    if (added) {
      router.back();
    }
  }, [added, router]);

  function choose(chosen: Ingredient) {
    setFailure(null);
    setIngredient(chosen);
    // Offer the food's suggested unit; the user can pick another of its units.
    setValue('unit', chosen.defaultUnit);
    setPicking(false);
  }

  const submit = handleSubmit(async (values) => {
    if (!ingredient) {
      return;
    }
    setFailure(null);
    try {
      await add.mutateAsync({ ingredientId: ingredient.id, ...toQuantity(values) });
      setAdded(true);
    } catch (error) {
      setFailure(inventoryErrorMessage(error));
    }
  });

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
            <ThemedText type="title">Añadir alimento</ThemedText>
            <ThemedText themeColor="textSecondary">
              Elige el alimento en el catálogo e indica cuánto tienes.
            </ThemedText>

            <Card style={styles.section}>
              <ThemedText type="heading" accessibilityRole="header">
                Alimento
              </ThemedText>
              {ingredient ? (
                <View style={styles.chosen}>
                  <ThemedText type="defaultBold">{ingredient.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {categoryLabel(ingredient.category)}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no has elegido ninguno.
                </ThemedText>
              )}
              <PrimaryButton
                label={ingredient ? 'Cambiar alimento' : 'Elegir alimento'}
                variant="secondary"
                onPress={() => setPicking(true)}
              />
            </Card>

            {/* The units depend on the food, so the quantity comes after it. */}
            {ingredient && (
              <Card style={styles.section}>
                <ThemedText type="heading" accessibilityRole="header">
                  Cantidad
                </ThemedText>
                <QuantityFields
                  control={control}
                  units={ingredient.units}
                  onChange={() => setFailure(null)}
                />
              </Card>
            )}

            <PrimaryButton
              label="Añadir al inventario"
              disabled={!ingredient}
              loading={add.isPending}
              onPress={() => void submit()}
            />
            {failure && (
              <Notice tone="error">{failure} Tus cambios siguen aquí, sin guardar.</Notice>
            )}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>

      {picking && (
        <IngredientPicker
          mode="single"
          title="Elegir alimento"
          onSelect={choose}
          onClose={() => setPicking(false)}
        />
      )}
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.lg,
  },
  chosen: {
    gap: Spacing.xs,
  },
});
