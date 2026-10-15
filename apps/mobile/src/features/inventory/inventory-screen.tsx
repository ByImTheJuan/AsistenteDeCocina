import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { InventoryItem } from './inventory-api';
import { inventoryErrorMessage } from './inventory-errors';
import { describeQuantity } from './inventory-item-form';
import { useInventory } from './use-inventory';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The foods the user has at home; each one opens to change or remove it. */
export function InventoryScreen() {
  const router = useRouter();
  const { data: inventory, isPending, error, refetch, isRefetching } = useInventory();
  const addItem = () => router.push('/inventory/new');

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando tu inventario" />;
  }

  if (!inventory) {
    return (
      <ScreenState
        kind="error"
        title="No se ha podido cargar tu inventario"
        message={inventoryErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  }

  if (inventory.items.length === 0) {
    return (
      <ScreenState
        kind="empty"
        title="Tu inventario está vacío"
        message="Añade los alimentos que tienes en casa para encontrar recetas con lo que ya tienes."
        action={{ label: 'Añadir alimento', onPress: addItem }}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Inventario
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Lo que tienes en casa. Toca un alimento para cambiar su cantidad o eliminarlo.
            </ThemedText>
          </View>

          <PrimaryButton label="Añadir alimento" onPress={addItem} />

          <View style={styles.items}>
            {inventory.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function ItemRow({ item }: { item: InventoryItem }) {
  const router = useRouter();
  const theme = useTheme();
  const quantity = describeQuantity(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.ingredient.name}: ${quantity}`}
      onPress={() => router.push({ pathname: '/inventory/[id]', params: { id: item.id } })}>
      {({ pressed }) => (
        <Card style={[styles.item, pressed && { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.itemText}>
            <ThemedText type="defaultBold">{item.ingredient.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {quantity}
            </ThemedText>
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
  items: {
    gap: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 64,
  },
  itemText: {
    flex: 1,
    gap: Spacing.xs,
  },
});
