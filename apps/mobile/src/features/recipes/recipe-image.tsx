import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The picture of a dish, or a neutral stand-in while the recipe has none.
 * Decorative: the name next to it says what it is.
 */
export function RecipeImage({
  uri,
  style,
}: {
  uri: string | null;
  style: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      testID={uri ? 'recipe-image' : 'recipe-image-placeholder'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { backgroundColor: theme.surfaceSecondary }, style]}>
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <SymbolView
          name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
          size={24}
          tintColor={theme.textSecondary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: Radius.md,
  },
});
