import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  describeExpiry,
  isExpiringSoon,
  isPastUseBy,
  storageLocationLabels,
  storageLocations,
  today,
  type StorageLocation,
} from './expiry';
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

// The pantry is grouped by where each food is kept, in this order.
const groups: { location: StorageLocation | null; title: string }[] = [
  ...storageLocations.map((location) => ({ location, title: storageLocationLabels[location] })),
  { location: null, title: 'Sin ubicación' },
];

/**
 * The foods the user has at home, grouped by location, with those that expire
 * soon first; each one opens to change or remove it.
 */
export function InventoryScreen() {
  const router = useRouter();
  const { data: inventory, isPending, error, refetch, isRefetching } = useInventory();
  const addItem = () => router.push('/inventory/new');

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando tu despensa" />;
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

  if (inventory.items.length === 0) {
    return (
      <ScreenState
        kind="empty"
        title="Tu despensa está vacía"
        message="Añade lo que tienes en casa para encontrar recetas con lo que ya tienes."
        action={{ label: 'Añadir alimento', onPress: addItem }}
      />
    );
  }

  // Expiry depends on the day it is for the user, so it is worked out here.
  const on = today();
  const expiringSoon = inventory.items
    .filter((item) => isExpiringSoon(item, on))
    .sort((a, b) => (a.expiresOn ?? '').localeCompare(b.expiresOn ?? ''));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Mi despensa
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Lo que tienes en casa. Toca un alimento para cambiarlo o eliminarlo.
            </ThemedText>
          </View>

          <PrimaryButton label="Añadir alimento" onPress={addItem} />

          {expiringSoon.length > 0 && (
            <View style={styles.group}>
              <ThemedText type="heading" accessibilityRole="header">
                Caducan pronto
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Caducados y los que vencen en los próximos 3 días. Revisa siempre el estado del
                alimento antes de consumirlo.
              </ThemedText>
              {expiringSoon.map((item) => (
                <ItemRow key={item.id} item={item} on={on} />
              ))}
            </View>
          )}

          {groups.map(({ location, title }) => {
            const items = inventory.items.filter((item) => item.location === location);
            return (
              items.length > 0 && (
                <View key={title} style={styles.group}>
                  <ThemedText type="heading" accessibilityRole="header">
                    {title}
                  </ThemedText>
                  {items.map((item) => (
                    <ItemRow key={item.id} item={item} on={on} />
                  ))}
                </View>
              )
            );
          })}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function ItemRow({ item, on }: { item: InventoryItem; on: string }) {
  const router = useRouter();
  const theme = useTheme();
  const quantity = describeQuantity(item);
  const expiry = describeExpiry(item, on);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.ingredient.name}: ${quantity}, ${expiry}`}
      onPress={() => router.push({ pathname: '/inventory/[id]', params: { id: item.id } })}>
      {({ pressed }) => (
        <Card style={[styles.item, pressed && { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.itemText}>
            <ThemedText type="defaultBold">{item.ingredient.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {quantity}
            </ThemedText>
            {/* A use-by date reached is said in words and in the error colour. */}
            <ThemedText
              type={isPastUseBy(item, on) ? 'smallBold' : 'small'}
              themeColor={isPastUseBy(item, on) ? 'error' : 'textSecondary'}>
              {expiry}
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
  group: {
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
