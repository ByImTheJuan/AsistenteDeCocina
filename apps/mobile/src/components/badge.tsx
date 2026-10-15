import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeProps = {
  /**
   * `warning` draws attention (mustard, as a background with dark text);
   * `danger` says something may be unsafe (red on a light red background).
   */
  tone: 'warning' | 'danger';
  children: string;
};

/** A short highlighted label, with a warning icon so colour is not the only cue. */
export function Badge({ tone, children }: BadgeProps) {
  const theme = useTheme();
  const colors =
    tone === 'warning'
      ? { background: theme.primary, text: 'onPrimary' as const }
      : { background: theme.errorSurface, text: 'error' as const };

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <SymbolView
        name={{
          ios: 'exclamationmark.triangle.fill',
          android: 'warning',
          web: 'warning',
        }}
        size={12}
        tintColor={theme[colors.text]}
      />
      <ThemedText type="smallBold" themeColor={colors.text}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radius.xl,
  },
});
