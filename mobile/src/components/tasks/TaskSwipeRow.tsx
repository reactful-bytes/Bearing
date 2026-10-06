import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';

type TaskSwipeRowProps = {
  completed: boolean;
  onComplete?: () => void | Promise<void>;
  disabled?: boolean;
  children: ReactNode;
};

export function TaskSwipeRow({
  completed,
  onComplete,
  disabled = false,
  children,
}: TaskSwipeRowProps) {
  const styles = useThemedStyles(createStyles);
  const translationX = useSharedValue(0);

  const swipeGesture = Gesture.Pan()
    .enabled(Boolean(onComplete) && !completed && !disabled)
    .activeOffsetX(12)
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translationX.set(Math.max(0, Math.min(event.translationX, 120)));
    })
    .onEnd((event) => {
      if (
        onComplete &&
        !completed &&
        !disabled &&
        event.translationX >= 80 &&
        Math.abs(event.translationY) <= 12
      ) {
        runOnJS(onComplete)();
      }
    })
    .onFinalize(() => {
      translationX.set(withSpring(0, { damping: 24, stiffness: 260 }));
    });
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translationX.value }],
  }));
  const actionStyle = useAnimatedStyle(() => ({
    width: translationX.value,
    opacity: translationX.value > 0 ? 1 : 0,
  }));

  return (
    <View style={styles.container}>
      {onComplete && !completed ? (
        <Animated.View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.action, actionStyle]}
        >
          <Text style={styles.actionLabel}>Complete</Text>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { overflow: 'hidden', borderRadius: theme.radii.md },
    action: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      overflow: 'hidden',
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.success,
    },
    actionLabel: { ...theme.typography.helper, color: theme.colors.onBrand, fontWeight: '700' },
  });
