import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  byExpiry,
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

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import {
  FloatingActionButton,
  FloatingActionButtonClearance,
} from '@/components/floating-action-button';
import { ScreenState } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The pantry is grouped by where each food is kept, in this order.
const groups: { location: StorageLocation | null; title: string }[] = [
  ...storageLocations.map((location) => ({ location, title: storageLocationLabels[location] })),
  { location: null, title: 'Sin ubicación' },
];

// The pantry is listed grouped by location, or ordered by date.
type PantryView = 'location' | 'date';
const pantryViews: { value: PantryView; label: string }[] = [
  { value: 'location', label: 'Ubicación' },
  { value: 'date', label: 'Fecha' },
];

const EXPIRING_SOON = 'Caducan pronto';
const DATED = 'Con fecha';
const UNDATED = 'Sin fecha';

/**
 * The foods the user has at home, grouped by location with those that expire
 * soon first, or ordered by date; each one opens to change or remove it.
 */
export function InventoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: inventory, isPending, error, refetch, isRefetching } = useInventory();
  const addItem = () => router.push('/inventory/new');
  const [view, setView] = useState<PantryView>('location');
  // Sections the user has folded; they stay folded while the screen is open.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggle = (title: string) =>
    setCollapsed((folded) => {
      const next = new Set(folded);
      if (!next.delete(title)) {
        next.add(title);
      }
      return next;
    });

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
  const byDate = byExpiry(inventory.items);
  const expiringSoon = byDate.dated.filter((item) => isExpiringSoon(item, on));

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

          <SegmentedControl
            label="Ver por"
            options={pantryViews}
            value={view}
            onChange={(next) => setView(next)}
          />

          {view === 'date' && (
            <>
              {byDate.dated.length > 0 && (
                <Section title={DATED} collapsed={collapsed.has(DATED)} onToggle={toggle}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Del más próximo al más lejano, con los caducados primero. Revisa siempre el
                    estado del alimento antes de consumirlo.
                  </ThemedText>
                  {byDate.dated.map((item) => (
                    <ItemRow key={item.id} item={item} on={on} />
                  ))}
                </Section>
              )}
              {byDate.undated.length > 0 && (
                <Section title={UNDATED} collapsed={collapsed.has(UNDATED)} onToggle={toggle}>
                  {byDate.undated.map((item) => (
                    <ItemRow key={item.id} item={item} on={on} />
                  ))}
                </Section>
              )}
            </>
          )}

          {view === 'location' && expiringSoon.length > 0 && (
            <>
              <Section
                title={EXPIRING_SOON}
                collapsed={collapsed.has(EXPIRING_SOON)}
                onToggle={toggle}>
                <ThemedText type="small" themeColor="textSecondary">
                  Caducados y los que vencen en los próximos 3 días. Revisa siempre el estado del
                  alimento antes de consumirlo.
                </ThemedText>
                {expiringSoon.map((item) => (
                  <ItemRow key={item.id} item={item} on={on} />
                ))}
              </Section>
              {/* Sets what needs attention apart from the rest of the pantry. */}
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
            </>
          )}

          {view === 'location' && groups.map(({ location, title }) => {
            const items = inventory.items.filter((item) => item.location === location);
            return (
              items.length > 0 && (
                <Section
                  key={title}
                  title={title}
                  collapsed={collapsed.has(title)}
                  onToggle={toggle}>
                  {items.map((item) => (
                    <ItemRow key={item.id} item={item} on={on} />
                  ))}
                </Section>
              )
            );
          })}
        </SafeAreaView>
      </ScrollView>

      {/* Apart from the list, so adding is not one more item stacked on it. */}
      <FloatingActionButton
        label="Añadir alimento"
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        onPress={addItem}
      />
    </ThemedView>
  );
}

/** A group of the pantry whose content can be folded away; its title stays. */
function Section({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle(title: string): void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <View style={styles.sectionHeader}>
        <ThemedText type="heading" accessibilityRole="header">
          {title}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? `Mostrar ${title}` : `Ocultar ${title}`}
          accessibilityState={{ expanded: !collapsed }}
          onPress={() => onToggle(title)}
          style={({ pressed }) => [
            styles.toggle,
            pressed && { backgroundColor: theme.surfaceSecondary },
          ]}>
          <SymbolView
            name={
              collapsed
                ? { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
                : { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
            }
            size={16}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>
      {!collapsed && children}
    </View>
  );
}

function ItemRow({ item, on }: { item: InventoryItem; on: string }) {
  const router = useRouter();
  const theme = useTheme();
  const quantity = describeQuantity(item);
  const expiry = describeExpiry(item, on);
  // A food that expires soon says so in a highlighted label: red when a
  // use-by date is today or past, mustard otherwise.
  const warning = isPastUseBy(item, on) ? 'danger' : isExpiringSoon(item, on) ? 'warning' : null;
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
            {warning ? (
              <Badge tone={warning}>{expiry}</Badge>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {expiry}
              </ThemedText>
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
    alignSelf: 'stretch',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    // Room for the floating button, so it never covers the last food.
    paddingBottom: BottomTabInset + Spacing.xl + FloatingActionButtonClearance,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.sm,
  },
  group: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  separator: {
    height: 1,
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
