import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SegmentedControlProps<Value extends string> = {
  /** Names the group for screen readers and is shown before the options. */
  label: string;
  options: { value: Value; label: string }[];
  value: Value;
  onChange(value: Value): void;
};

/**
 * A few mutually exclusive ways to see the same content ("Ubicación",
 * "Fecha"). The chosen option is raised on a white surface, bold and with a
 * check, so colour is not the only cue.
 */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.track, { backgroundColor: theme.surfaceSecondary }]}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                checked && {
                  backgroundColor: theme.surface,
                  borderColor: theme.textPrimary,
                },
                !checked && pressed && { backgroundColor: theme.border },
              ]}>
              <ThemedText type={checked ? 'smallBold' : 'small'}>
                {checked ? `✓ ${option.label}` : option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.xs,
  },
  track: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.md,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.sm,
  },
});
