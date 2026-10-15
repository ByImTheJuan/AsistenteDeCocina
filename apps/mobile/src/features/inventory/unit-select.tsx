import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { unitName, unitSymbol, type Unit } from '@/features/units/units';
import { useTheme } from '@/hooks/use-theme';

type UnitSelectProps = {
  /** The units the food is measured in, in the order they are offered. */
  units: Unit[];
  value: Unit;
  /** The quantity written next to it, to say "1 unidad" or "2 unidades". */
  quantity: number | null;
  onChange(unit: Unit): void;
};

/**
 * The unit at the end of a quantity field. With several units to choose from
 * it opens a list of them; with only one it is plain text.
 */
export function UnitSelect({ units, value, quantity, onChange }: UnitSelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const symbol = unitSymbol(value, quantity);

  if (units.length <= 1) {
    return (
      <View style={[styles.trigger, { borderLeftColor: theme.border }]}>
        <ThemedText themeColor="textSecondary">{symbol}</ThemedText>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unidad: ${unitName(value)}`}
        accessibilityHint="Cambia la unidad de la cantidad"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { borderLeftColor: theme.border },
          pressed && { backgroundColor: theme.surfaceSecondary },
        ]}>
        <ThemedText type="defaultBold">{symbol}</ThemedText>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={14}
          tintColor={theme.textPrimary}
        />
      </Pressable>

      {open && (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            accessibilityLabel="Cerrar sin cambiar la unidad"
            onPress={() => setOpen(false)}
            style={[styles.backdrop, { backgroundColor: theme.backdrop }]}>
            {/* Taps on the list do not reach the backdrop behind it. */}
            <Pressable accessible={false} style={styles.sheet}>
              <Card style={styles.list}>
                <ThemedText type="heading" accessibilityRole="header">
                  Unidad
                </ThemedText>
                <View accessibilityRole="radiogroup" accessibilityLabel="Unidad" style={styles.options}>
                  {units.map((unit) => {
                    const checked = unit === value;
                    return (
                      <Pressable
                        key={unit}
                        accessibilityRole="radio"
                        accessibilityLabel={unitName(unit)}
                        accessibilityState={{ checked }}
                        onPress={() => {
                          setOpen(false);
                          onChange(unit);
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          {
                            borderColor: checked ? theme.textPrimary : theme.borderStrong,
                            backgroundColor:
                              checked || pressed ? theme.surfaceSecondary : theme.surface,
                          },
                        ]}>
                        <ThemedText type={checked ? 'defaultBold' : 'default'} style={styles.label}>
                          {unitName(unit)}
                        </ThemedText>
                        {checked && <ThemedText type="defaultBold">✓</ThemedText>}
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 44,
    paddingHorizontal: Spacing.lg,
    borderLeftWidth: 1,
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  list: {
    alignSelf: 'stretch',
    gap: Spacing.lg,
    maxWidth: MaxContentWidth / 2,
    width: '100%',
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  label: {
    flex: 1,
  },
});
