import { Controller, useWatch, type Control } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import type { InventoryItemForm } from './inventory-item-form';
import { UnitSelect } from './unit-select';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseQuantity, type Unit } from '@/features/units/units';

type QuantityFieldsProps = {
  control: Control<InventoryItemForm>;
  /** The units the food is measured in. */
  units: Unit[];
  /** Called on every edit, before the value changes. */
  onChange(): void;
};

/**
 * How much of a food there is: a number and, inside the same field, its unit
 * ("1,5 kg"). Empty means the food is always available.
 */
export function QuantityFields({ control, units, onChange }: QuantityFieldsProps) {
  const quantity = parseQuantity(useWatch({ control, name: 'quantity' }));

  return (
    <View style={styles.field}>
      <Controller
        control={control}
        name="quantity"
        render={({ field: { value, onChange: setQuantity, onBlur }, fieldState }) => (
          <TextField
            label="Cantidad"
            placeholder="Siempre disponible"
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
            trailing={
              <Controller
                control={control}
                name="unit"
                render={({ field: { value: unit, onChange: setUnit } }) => (
                  <UnitSelect
                    units={units}
                    value={unit}
                    quantity={quantity}
                    onChange={(chosen) => {
                      onChange();
                      setUnit(chosen);
                    }}
                  />
                )}
              />
            }
          />
        )}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Déjala vacía para indicar que este alimento siempre estará disponible en tu cocina.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
});
