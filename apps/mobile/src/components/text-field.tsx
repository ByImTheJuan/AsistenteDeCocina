import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  /** Shown inside the field, after the text: a unit, or a control to change it. */
  trailing?: ReactNode;
};

/** Labelled text input that shows its validation error underneath. */
export function TextField({ label, error, trailing, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const disabled = inputProps.editable === false;
  const box = [
    styles.box,
    {
      backgroundColor: disabled ? theme.disabledSurface : theme.surface,
      borderColor: error ? theme.error : disabled ? theme.disabledBorder : theme.borderStrong,
    },
    error !== undefined && styles.boxInvalid,
  ];
  const input = (
    <TextInput
      accessibilityLabel={label}
      accessibilityHint={error}
      aria-invalid={error !== undefined}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { color: disabled ? theme.disabledText : theme.textPrimary },
        trailing ? styles.inputBeforeTrailing : box,
      ]}
      {...inputProps}
    />
  );

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {trailing ? (
        // The border wraps the text and what follows it, so both read as one
        // field: "1,5 | kg".
        <View style={[box, styles.row]}>
          {input}
          {trailing}
        </View>
      ) : (
        input
      )}
      {error && (
        // The icon and the text carry the error, not only the red.
        <View style={styles.error}>
          <ThemedText type="small" themeColor="error" importantForAccessibility="no" aria-hidden>
            ⚠
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="error"
            accessibilityRole="alert"
            style={styles.errorText}>
            {error}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignSelf: 'stretch',
    gap: Spacing.xs,
  },
  box: {
    minHeight: ControlHeight,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  boxInvalid: {
    borderWidth: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  input: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 16,
  },
  inputBeforeTrailing: {
    flex: 1,
  },
  error: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
  },
});
