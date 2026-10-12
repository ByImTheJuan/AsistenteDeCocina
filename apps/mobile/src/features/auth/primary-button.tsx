import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  label: string;
  onPress(): void;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, loading = false }: PrimaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.text },
        (pressed || loading) && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.background} />
      ) : (
        <ThemedText themeColor="background">{label}</ThemedText>
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
