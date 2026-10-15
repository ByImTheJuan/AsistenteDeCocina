import { Colors, type ThemeColor } from './theme';

// WCAG 2.1 relative luminance and contrast ratio.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const TEXT = 4.5;
const CONTROL_BOUNDARY = 3;
const surfaces: ThemeColor[] = ['background', 'surface', 'surfaceSecondary'];

// Every pair the screens rely on, with the minimum WCAG AA asks of it. The
// table and the reasons are in docs/decisions/0004-sistema-de-diseno.md.
const pairs: [ThemeColor, ThemeColor, number][] = [
  ...surfaces.flatMap((surface): [ThemeColor, ThemeColor, number][] => [
    ['textPrimary', surface, TEXT],
    ['textSecondary', surface, TEXT],
    ['error', surface, TEXT],
    ['success', surface, TEXT],
    ['borderStrong', surface, CONTROL_BOUNDARY],
  ]),
  ['onPrimary', 'primary', TEXT],
  ['onPrimary', 'primaryPressed', TEXT],
  ['onError', 'error', TEXT],
  ['error', 'errorSurface', TEXT],
  ['success', 'successSurface', TEXT],
  ['textPrimary', 'surfaceSecondary', TEXT],
  // Disabled controls are exempt; they stay readable anyway.
  ['disabledText', 'disabledSurface', CONTROL_BOUNDARY],
];

describe('light palette contrast', () => {
  it.each(pairs)('%s on %s reaches %d:1', (foreground, background, minimum) => {
    expect(contrast(Colors.light[foreground], Colors.light[background])).toBeGreaterThanOrEqual(
      minimum,
    );
  });

  it('keeps mustard away from white text and from text on the background', () => {
    // Documented limits: these combinations must not be used.
    expect(contrast('#FFFFFF', Colors.light.primary)).toBeLessThan(TEXT);
    expect(contrast(Colors.light.primary, Colors.light.background)).toBeLessThan(CONTROL_BOUNDARY);
  });
});
