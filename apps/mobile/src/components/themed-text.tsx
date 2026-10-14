import { StyleSheet, Text, type TextProps } from 'react-native';

import { MonoFont, ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /**
   * `title` for the screen title, `heading` for a section, `small` for
   * secondary text and `label` for tags and metadata. `link` and `code` are
   * left for the Expo template screens.
   */
  type?: 'default' | 'title' | 'heading' | 'small' | 'smallBold' | 'label' | 'link' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text style={[{ color: theme[themeColor ?? 'textPrimary'] }, styles[type], style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  ...Typography,
  link: {
    ...Typography.small,
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: MonoFont,
    fontSize: 12,
  },
});
