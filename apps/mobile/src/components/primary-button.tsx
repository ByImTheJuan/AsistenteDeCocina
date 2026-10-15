import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  label: string;
  onPress(): void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * `secondary` for an alternative that should not compete with the main
   * action; `danger` for actions that destroy data.
   */
  variant?: 'primary' | 'secondary' | 'danger';
};

type Appearance = {
  background: ThemeColor;
  pressed: ThemeColor;
  text: ThemeColor;
  border?: ThemeColor;
};

const appearances: Record<NonNullable<PrimaryButtonProps['variant']>, Appearance> = {
  // Dark text on mustard: white on it does not reach the contrast for text.
  primary: { background: 'primary', pressed: 'primaryPressed', text: 'onPrimary' },
  secondary: {
    background: 'surfaceSecondary',
    pressed: 'border',
    text: 'textPrimary',
    border: 'borderStrong',
  },
  danger: { background: 'error', pressed: 'error', text: 'onError' },
};

const disabledAppearance: Appearance = {
  background: 'disabledSurface',
  pressed: 'disabledSurface',
  text: 'disabledText',
  border: 'disabledBorder',
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const theme = useTheme();
  const inactive = loading || disabled;
  // A button that is only busy keeps its colours so it does not look disabled.
  const appearance = disabled ? disabledAppearance : appearances[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme[pressed ? appearance.pressed : appearance.background],
          borderColor: appearance.border ? theme[appearance.border] : 'transparent',
        },
        pressed && variant === 'danger' && styles.pressedDanger,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[appearance.text]} />
      ) : (
        <ThemedText type="smallBold" themeColor={appearance.text} style={styles.label}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ControlHeight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  // The destructive red has no darker token; dimming it is enough feedback.
  pressedDanger: {
    opacity: 0.85,
  },
});
