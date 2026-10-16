import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Share of the width a card must travel to count as a decision. */
const DECISION_SHARE = 0.3;
/** A quicker flick than this (points per second) decides too. */
const DECISION_VELOCITY = 800;
const LEAVE_MS = 200;

type Direction = 'reject' | 'accept';

type SwipeDeckProps<T> = {
  /** The cards still to decide, the next one first. */
  items: T[];
  keyOf(item: T): string;
  renderCard(item: T): ReactNode;
  /** What screen readers announce for a card. */
  labelOf(item: T): string;
  /** Swiped to the left, or the reject button. */
  onReject(item: T): void;
  /** Swiped to the right, or the accept button. */
  onAccept(item: T): void;
  labels: { reject: string; accept: string };
};

/**
 * One card at a time, with the next one peeking behind: swiping to the right
 * accepts it, to the left rejects it. The buttons below and the
 * accessibility actions of the card do the same for whoever cannot swipe.
 * The parent drops the decided card from `items`.
 */
export function SwipeDeck<T>({
  items,
  keyOf,
  renderCard,
  labelOf,
  onReject,
  onAccept,
  labels,
}: SwipeDeckProps<T>) {
  const [current, next] = items;
  if (current === undefined) {
    return null;
  }
  return (
    // A new key per card, so each one starts centred.
    <SwipeCard
      key={keyOf(current)}
      label={labelOf(current)}
      labels={labels}
      behind={next === undefined ? null : renderCard(next)}
      onDecide={(direction) => (direction === 'accept' ? onAccept : onReject)(current)}>
      {renderCard(current)}
    </SwipeCard>
  );
}

function SwipeCard({
  label,
  labels,
  behind,
  onDecide,
  children,
}: {
  label: string;
  labels: SwipeDeckProps<unknown>['labels'];
  /** The next card, peeking behind. */
  behind: ReactNode;
  onDecide(direction: Direction): void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const distance = width * DECISION_SHARE;

  // The card leaves the screen, then the decision is passed on. With reduced
  // motion turned on, Reanimated skips the animation itself.
  const leave = (direction: Direction) => {
    'worklet';
    offset.value = withTiming(
      (direction === 'accept' ? 1 : -1) * width * 1.5,
      { duration: LEAVE_MS },
      (finished) => {
        if (finished) scheduleOnRN(onDecide, direction);
      },
    );
  };

  // Only horizontal drags: vertical ones keep scrolling the screen.
  const pan = Gesture.Pan()
    // One id per card: tests find the gesture of the card on screen.
    .withTestId(`swipe:${label}`)
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      offset.value = event.translationX;
    })
    .onEnd((event) => {
      const accepted = offset.value > distance || event.velocityX > DECISION_VELOCITY;
      const rejected = offset.value < -distance || event.velocityX < -DECISION_VELOCITY;
      if (accepted || rejected) {
        leave(accepted ? 'accept' : 'reject');
      } else {
        offset.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value },
      { rotate: `${interpolate(offset.value, [-width, 0, width], [-12, 0, 12])}deg` },
    ],
  }));
  const acceptStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, distance], [0, 1], 'clamp'),
  }));
  const rejectStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [-distance, 0], [1, 0], 'clamp'),
  }));

  const onAccessibilityAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    if (nativeEvent.actionName === 'accept' || nativeEvent.actionName === 'reject') {
      leave(nativeEvent.actionName);
    }
  };

  return (
    <View style={styles.deck}>
      <View>
        {behind !== null && (
          <View
            style={[styles.behind, { backgroundColor: theme.surface, borderColor: theme.border }]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {behind}
          </View>
        )}
        <GestureDetector gesture={pan}>
        <Animated.View
          style={cardStyle}
          accessible
          accessibilityLabel={label}
          accessibilityHint={`Desliza a la derecha: ${labels.accept}. A la izquierda: ${labels.reject}.`}
          accessibilityActions={[
            { name: 'accept', label: labels.accept },
            { name: 'reject', label: labels.reject },
          ]}
          onAccessibilityAction={onAccessibilityAction}>
          {children}
          <Animated.View
            pointerEvents="none"
            style={[styles.stamp, styles.acceptStamp, { backgroundColor: theme.primary }, acceptStyle]}>
            <SymbolView
              name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
              size={16}
              tintColor={theme.onPrimary}
            />
            <ThemedText type="smallBold" themeColor="onPrimary">
              {labels.accept}
            </ThemedText>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stamp,
              styles.rejectStamp,
              { backgroundColor: theme.surface, borderColor: theme.borderStrong },
              rejectStyle,
            ]}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={16}
              tintColor={theme.textPrimary}
            />
            <ThemedText type="smallBold">{labels.reject}</ThemedText>
          </Animated.View>
        </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.buttons}>
        <View style={styles.button}>
          <PrimaryButton
            variant="secondary"
            label={labels.reject}
            onPress={() => leave('reject')}
          />
        </View>
        <View style={styles.button}>
          <PrimaryButton label={labels.accept} onPress={() => leave('accept')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    gap: Spacing.xl,
  },
  // The next card, a little smaller and lower, under the current one.
  behind: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: Radius.lg,
    borderWidth: 1,
    transform: [{ translateY: Spacing.md }, { scale: 0.95 }],
  },
  stamp: {
    position: 'absolute',
    top: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  acceptStamp: {
    left: Spacing.lg,
  },
  rejectStamp: {
    right: Spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  button: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
