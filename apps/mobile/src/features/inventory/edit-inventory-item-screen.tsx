import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { InventoryItem } from './inventory-api';
import { inventoryErrorMessage } from './inventory-errors';
import { quantityFormSchema, toForm, toQuantity, type QuantityForm } from './inventory-item-form';
import { QuantityFields } from './quantity-fields';
import { useInventory, useRemoveInventoryItem, useUpdateInventoryItem } from './use-inventory';

import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/features/ingredients/ingredients-api';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

/** Changes the quantity of one item of the inventory, or removes it. */
export function EditInventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: inventory, isPending, error, refetch, isRefetching } = useInventory();
  const found = inventory?.items.find((item) => item.id === id);
  // Once removed, the item leaves the cache while the screen is closing; it
  // keeps showing what it had instead of flashing "not found".
  const [lastSeen, setLastSeen] = useState(found);
  if (found && found !== lastSeen) {
    setLastSeen(found);
  }
  const item = found ?? lastSeen;

  if (item) {
    return <EditForm item={item} />;
  }

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando el alimento" />;
  }

  if (!inventory) {
    return (
      <ScreenState
        kind="error"
        title="No se ha podido cargar tu despensa"
        message={inventoryErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <ScreenState
      kind="empty"
      title="Este alimento ya no está en tu despensa"
      message="Puede que lo hayas eliminado desde otro dispositivo."
    />
  );
}

function EditForm({ item }: { item: InventoryItem }) {
  const router = useRouter();
  const update = useUpdateInventoryItem(item.id);
  const remove = useRemoveInventoryItem(item.id);
  // The form holds a draft; nothing reaches the API until it is saved.
  const { control, handleSubmit } = useForm<QuantityForm>({
    resolver: zodResolver(quantityFormSchema),
    defaultValues: toForm(item, item.ingredient),
  });
  const { isDirty } = useFormState({ control });
  const [failure, setFailure] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  useUnsavedChangesWarning(isDirty && !finished);

  // Back to the inventory once the warning above has been switched off.
  useEffect(() => {
    if (finished) {
      router.back();
    }
  }, [finished, router]);

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await update.mutateAsync(toQuantity(values));
      setFinished(true);
    } catch (error) {
      setFailure(`${inventoryErrorMessage(error)} Tus cambios siguen aquí, sin guardar.`);
    }
  });

  async function handleRemove() {
    try {
      await remove.mutateAsync();
      setFinished(true);
    } catch (error) {
      setFailure(inventoryErrorMessage(error));
    }
  }

  function askToRemove() {
    setFailure(null);
    Alert.alert(
      `¿Eliminar ${item.ingredient.name} de la despensa?`,
      'Podrás volver a añadirlo cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void handleRemove() },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
            <ThemedText type="title">{item.ingredient.name}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {categoryLabel(item.ingredient.category)}
            </ThemedText>

            <Card style={styles.section}>
              <ThemedText type="heading" accessibilityRole="header">
                Cantidad
              </ThemedText>
              <QuantityFields
                control={control}
                units={item.ingredient.units}
                onChange={() => setFailure(null)}
              />
            </Card>

            <PrimaryButton
              label="Guardar"
              disabled={!isDirty || remove.isPending}
              loading={update.isPending}
              onPress={() => void submit()}
            />
            {failure && <Notice tone="error">{failure}</Notice>}

            <PrimaryButton
              label="Eliminar de la despensa"
              variant="danger"
              disabled={update.isPending}
              loading={remove.isPending}
              onPress={askToRemove}
            />
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
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
});
