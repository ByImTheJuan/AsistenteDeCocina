import { Controller, type Control } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import type { QuantityForm } from './inventory-item-form';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { unitName, units, type Unit } from '@/features/units/units';
import { useTheme } from '@/hooks/use-theme';

type QuantityFieldsProps = {
  control: Control<QuantityForm>;
  /** Called on every edit, before the value changes. */
  onChange(): void;
};

/** How much of a food there is: an optional number and its unit. */
export function QuantityFields({ control, onChange }: QuantityFieldsProps) {
  return (
    <>
      <Controller
        control={control}
        name="quantity"
        render={({ field: { value, onChange: setQuantity, onBlur }, fieldState }) => (
          <View style={styles.field}>
            <TextField
              label="Cantidad"
              placeholder="Sin indicar"
              value={value}
              onChangeText={(text) => {
                onChange();
                setQuantity(text);
              }}
              onBlur={onBlur}
              error={fieldState.error?.message}
              keyboardType="decimal-pad"
              inputMode="decimal"
              maxLength={10}
              returnKeyType="done"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Déjala vacía si no sabes cuánto tienes.
            </ThemedText>
          </View>
        )}
      />
      <Controller
        control={control}
        name="unit"
        render={({ field: { value, onChange: setUnit } }) => (
          <View style={styles.field}>
            <ThemedText type="label">Unidad</ThemedText>
            <View accessibilityRole="radiogroup" accessibilityLabel="Unidad" style={styles.units}>
              {units.map((unit) => (
                <UnitOption
                  key={unit}
                  unit={unit}
                  checked={value === unit}
                  onPress={() => {
                    onChange();
                    setUnit(unit);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      />
    </>
  );
}

function UnitOption({
  unit,
  checked,
  onPress,
}: {
  unit: Unit;
  checked: boolean;
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={unitName(unit)}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.unit,
        {
          borderColor: checked ? theme.textPrimary : theme.borderStrong,
          backgroundColor: checked || pressed ? theme.surfaceSecondary : theme.surface,
        },
      ]}>
      <ThemedText type={checked ? 'smallBold' : 'small'}>
        {checked ? `✓ ${unitName(unit)}` : unitName(unit)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  units: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  unit: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
});
