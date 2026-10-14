import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenStateProps =
  | { kind: 'loading'; label: string }
  | {
      kind: 'error';
      title: string;
      message: string;
      onRetry(): void;
      retrying?: boolean;
    }
  | { kind: 'empty'; title: string; message?: string };

/** Whole-screen loading, error and empty states, centred on the background. */
export function ScreenState(props: ScreenStateProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.centered}>
      {props.kind === 'loading' ? (
        <ActivityIndicator size="large" color={theme.textPrimary} accessibilityLabel={props.label} />
      ) : (
        <View style={styles.message}>
          <ThemedText type="heading" style={styles.text}>
            {props.title}
          </ThemedText>
          {props.message !== undefined && (
            <ThemedText themeColor="textSecondary" style={styles.text}>
              {props.message}
            </ThemedText>
          )}
          {props.kind === 'error' && (
            <PrimaryButton label="Reintentar" loading={props.retrying} onPress={props.onRetry} />
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  message: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.lg,
    maxWidth: MaxContentWidth,
  },
  text: {
    textAlign: 'center',
  },
});
