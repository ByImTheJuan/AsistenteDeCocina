/**
 * Design tokens. Screens read colours through `useTheme()` and never use
 * literal values. The palette, its contrast checks and the rules for each
 * token are in docs/decisions/0004-sistema-de-diseno.md.
 */

import '@/global.css';

import { Platform } from 'react-native';

const light = {
  primary: '#E2B52B',
  primaryPressed: '#D4A520',
  onPrimary: '#302F29',
  background: '#FFF9EB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1E8D5',
  textPrimary: '#302F29',
  textSecondary: '#5E5A4F',
  /** Decorative only: it does not reach the contrast needed for text. */
  accent: '#E47D54',
  /** Dividers and decorative outlines; controls use `borderStrong`. */
  border: '#D8D2C5',
  borderStrong: '#8A8373',
  success: '#4F6E55',
  successSurface: '#EAF1EB',
  error: '#B3261E',
  errorSurface: '#FBEAE8',
  onError: '#FFFFFF',
  disabledSurface: '#EDE7DA',
  disabledText: '#7D786C',
  disabledBorder: '#D8D2C5',
  /** Dims the screen behind a menu or dialog drawn on top of it. */
  backdrop: 'rgba(48, 47, 41, 0.4)',
} as const;

export type ThemeColors = { readonly [K in keyof typeof light]: string };
export type ThemeColor = keyof ThemeColors;

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light,
  // There is no dark mode yet: the app is locked to the light scheme. Giving
  // these tokens their own values (and checking their contrast) is all a dark
  // mode needs.
  dark: light,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/**
 * Soft shadow that lifts cards off the cream background, where white alone
 * barely shows. One level only: no heavier shadows.
 */
export const CardShadow = '0px 1px 4px rgba(48, 47, 41, 0.10)';

/** Minimum height of buttons and fields. Never a fixed height: text scales. */
export const ControlHeight = 52;

/**
 * One family per weight: Android may fake bold when `fontWeight` is combined
 * with a custom font. The fonts are loaded in the root layout; until then, or
 * if they fail, the platform falls back to the system font.
 */
export const FontFamily = {
  regular: 'NunitoSans_400Regular',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
} as const;

export const MonoFont = Platform.select({
  ios: 'ui-monospace',
  web: 'var(--font-mono)',
  default: 'monospace',
});

export const Typography = {
  title: { fontFamily: FontFamily.bold, fontSize: 31, lineHeight: 38 },
  heading: { fontFamily: FontFamily.semiBold, fontSize: 22, lineHeight: 28 },
  default: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 },
  defaultBold: { fontFamily: FontFamily.semiBold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: FontFamily.semiBold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, lineHeight: 18 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
