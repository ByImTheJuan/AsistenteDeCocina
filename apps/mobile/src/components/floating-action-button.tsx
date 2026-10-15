import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Diameter of the button; screens leave this much room below their content. */
export const FloatingActionButtonSize = 56;

/** Space a scrolling screen leaves at its end so the button never hides content. */
export const FloatingActionButtonClearance = FloatingActionButtonSize + Spacing.xl;

type FloatingActionButtonProps = {
  /** What the button does, for screen readers: it shows only an icon. */
  label: string;
  icon: SymbolViewProps['name'];
  onPress(): void;
};

/**
 * The main action of a list screen, in a round button that floats over the
 * list, centred above the tab bar. Place it as the last child of the screen.
 * Each native tab has its own safe area, whose bottom inset already includes
 * the tab bar, so the inset alone keeps the button clear of it.
 */
export function FloatingActionButton({ label, icon, onPress }: FloatingActionButtonProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          bottom: insets.bottom + Spacing.lg,
          backgroundColor: pressed ? theme.primaryPressed : theme.primary,
        },
      ]}>
      <SymbolView name={icon} size={24} tintColor={theme.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: FloatingActionButtonSize,
    height: FloatingActionButtonSize,
    borderRadius: FloatingActionButtonSize / 2,
    boxShadow: CardShadow,
  },
});
