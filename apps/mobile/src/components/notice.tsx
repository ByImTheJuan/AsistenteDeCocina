import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NoticeTone = 'error' | 'success' | 'warning';

type NoticeProps = {
  tone: NoticeTone;
  title?: string;
  /** Text, possibly with nested `ThemedText`. */
  children: ReactNode;
  /** Replaces what screen readers announce for the whole notice. */
  accessibilityLabel?: string;
};

const tones: Record<NoticeTone, { icon: string; color: ThemeColor; background: ThemeColor }> = {
  error: { icon: '⚠', color: 'error', background: 'errorSurface' },
  success: { icon: '✓', color: 'success', background: 'successSurface' },
  // Warnings are about safety (allergens): red border, neutral background,
  // so the text keeps its full contrast.
  warning: { icon: '⚠', color: 'error', background: 'surface' },
};

/**
 * Message about the outcome of an action or something the user must know.
 * The icon and the text carry the meaning, never the colour alone, and errors
 * are announced by screen readers.
 */
export function Notice({ tone, title, children, accessibilityLabel }: NoticeProps) {
  const theme = useTheme();
  const { icon, color, background } = tones[tone];

  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      style={[styles.notice, { backgroundColor: theme[background], borderColor: theme[color] }]}>
      <ThemedText type="smallBold" themeColor={color} importantForAccessibility="no" aria-hidden>
        {icon}
      </ThemedText>
      <View style={styles.body}>
        {title && (
          <ThemedText type="smallBold" themeColor={tone === 'success' ? 'success' : 'textPrimary'}>
            {title}
          </ThemedText>
        )}
        <ThemedText
          type="small"
          themeColor={tone === 'warning' ? 'textPrimary' : color}
          accessibilityRole={tone === 'error' ? 'alert' : undefined}
          accessibilityLiveRegion={tone === 'success' ? 'polite' : undefined}>
          {children}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
});
