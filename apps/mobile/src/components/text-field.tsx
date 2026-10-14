import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
};

/** Labelled text input that shows its validation error underneath. */
export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const disabled = inputProps.editable === false;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        aria-invalid={error !== undefined}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            color: disabled ? theme.disabledText : theme.textPrimary,
            backgroundColor: disabled ? theme.disabledSurface : theme.surface,
            borderColor: error ? theme.error : disabled ? theme.disabledBorder : theme.borderStrong,
          },
          error !== undefined && styles.inputInvalid,
        ]}
        {...inputProps}
      />
      {error && (
        // The icon and the text carry the error, not only the red.
        <View style={styles.error}>
          <ThemedText type="small" themeColor="error" importantForAccessibility="no" aria-hidden>
            ⚠
          </ThemedText>
          <ThemedText type="small" themeColor="error" accessibilityRole="alert" style={styles.errorText}>
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
  input: {
    minHeight: ControlHeight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    fontFamily: FontFamily.regular,
    fontSize: 16,
  },
  error: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  inputInvalid: {
    borderWidth: 2,
  },
});
