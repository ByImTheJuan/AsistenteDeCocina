import { Colors } from '@/constants/theme';

/**
 * The app is light only for now (docs/decisions/0004-sistema-de-diseno.md).
 * Following the system scheme again is all a dark mode needs here.
 */
export function useTheme() {
  return Colors.light;
}
