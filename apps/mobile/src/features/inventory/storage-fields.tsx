import { Controller, useWatch, type Control } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { DatePickerField } from './date-picker-field';
import {
  expiryKindLabels,
  storageLocationLabels,
  storageLocations,
  type ExpiryKind,
} from './expiry';
import type { InventoryItemForm } from './inventory-item-form';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StorageFieldsProps = {
  control: Control<InventoryItemForm>;
  /** Called on every edit, before the value changes. */
  onChange(): void;
};

const expiryKinds: ExpiryKind[] = ['USE_BY', 'BEST_BEFORE'];

/** Where a food is kept and the date on its label, both optional. */
export function StorageFields({ control, onChange }: StorageFieldsProps) {
  const expiresOn = useWatch({ control, name: 'expiresOn' });

  return (
    <>
      <Controller
        control={control}
        name="location"
        render={({ field: { value, onChange: setLocation } }) => (
          <View style={styles.field}>
            <ThemedText type="label">Ubicación</ThemedText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Ubicación"
              style={styles.options}>
              {storageLocations.map((location) => (
                <Option
                  key={location}
                  label={storageLocationLabels[location]}
                  checked={value === location}
                  onPress={() => {
                    onChange();
                    setLocation(location);
                  }}
                />
              ))}
              <Option
                label="Sin indicar"
                checked={value === null}
                onPress={() => {
                  onChange();
                  setLocation(null);
                }}
              />
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="expiresOn"
        render={({ field: { value, onChange: setDate } }) => (
          <DatePickerField
            value={value}
            onChange={(day) => {
              onChange();
              setDate(day);
            }}
          />
        )}
      />

      {/* Only a date has a kind. */}
      {expiresOn !== null && (
        <Controller
          control={control}
          name="dateKind"
          render={({ field: { value, onChange: setKind } }) => (
            <View style={styles.field}>
              <ThemedText type="label">Tipo de fecha</ThemedText>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Tipo de fecha"
                style={styles.options}>
                {expiryKinds.map((kind) => (
                  <Option
                    key={kind}
                    label={expiryKindLabels[kind].name}
                    hint={expiryKindLabels[kind].description}
                    checked={value === kind}
                    onPress={() => {
                      onChange();
                      setKind(kind);
                    }}
                  />
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {expiryKindLabels[value].description}
              </ThemedText>
            </View>
          )}
        />
      )}
    </>
  );
}

function Option({
  label,
  hint,
  checked,
  onPress,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: checked ? theme.textPrimary : theme.borderStrong,
          backgroundColor: checked || pressed ? theme.surfaceSecondary : theme.surface,
        },
      ]}>
      <ThemedText type={checked ? 'smallBold' : 'small'}>
        {checked ? `✓ ${label}` : label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  option: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
});
