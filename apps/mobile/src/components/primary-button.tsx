import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const theme = useTheme();
  const inactive = loading || disabled;
  const background =
    variant === 'primary'
      ? theme.text
      : variant === 'danger'
        ? theme.danger
        : theme.backgroundSelected;
  const foreground = variant === 'secondary' ? 'text' : 'background';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        (pressed || inactive) && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[foreground]} />
      ) : (
        <ThemedText themeColor={foreground}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  dimmed: {
    opacity: 0.7,
  },
});
