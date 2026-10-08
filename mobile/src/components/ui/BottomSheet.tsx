import { ReactNode, useLayoutEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  handleColor?: string;
  testID?: string;
};

export function BottomSheet({
  visible,
  onDismiss,
  children,
  accessibilityLabel = 'Bottom sheet',
  style,
  handleColor,
  testID,
}: BottomSheetProps) {
  const styles = useThemedStyles(createStyles);
  const { height: windowHeight } = useWindowDimensions();
  const sheetTranslateY = useSharedValue(0);
  const sheetPanGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      sheetTranslateY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > 88 || event.velocityY > 700) {
        sheetTranslateY.set(
          withTiming(windowHeight, { duration: 180 }, (finished) => {
            if (finished) runOnJS(onDismiss)();
          }),
        );
        return;
      }

      sheetTranslateY.set(withSpring(0, { damping: 24, stiffness: 260 }));
    });
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: windowHeight > 0 ? Math.max(0, 1 - sheetTranslateY.value / windowHeight) : 0,
  }));

  useLayoutEffect(() => {
    if (!visible) return;
    cancelAnimation(sheetTranslateY);
    sheetTranslateY.set(0);
  }, [sheetTranslateY, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <Animated.View pointerEvents="none" style={[styles.scrim, backdropAnimatedStyle]} />
          <Pressable
            testID={testID ? `${testID}-backdrop` : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${accessibilityLabel}`}
            onPress={onDismiss}
            style={styles.backdropPressArea}
          />
          <Animated.View style={[styles.sheetMotion, sheetAnimatedStyle]}>
            <SafeAreaView
              testID={testID}
              accessibilityViewIsModal
              accessible
              accessibilityLabel={accessibilityLabel}
              edges={['bottom', 'left', 'right']}
              style={[styles.sheet, style]}
            >
              <GestureDetector gesture={sheetPanGesture}>
                <View
                  testID={testID ? `${testID}-drag-handle` : undefined}
                  style={styles.handleContainer}
                >
                  <View style={styles.handleTarget}>
                    <View
                      style={[styles.handle, handleColor ? { backgroundColor: handleColor } : null]}
                    />
                  </View>
                </View>
              </GestureDetector>
              {children}
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gestureRoot: { flex: 1 },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.scrim,
    },
    backdropPressArea: {
      ...StyleSheet.absoluteFill,
    },
    sheetMotion: {
      alignSelf: 'stretch',
    },
    sheet: {
      maxHeight: '100%',
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: 0,
      paddingBottom: theme.spacing['2xl'],
      gap: theme.spacing.lg,
    },
    handleContainer: {
      alignItems: 'center',
      marginBottom: -theme.spacing.lg,
    },
    handleTarget: {
      minWidth: 64,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handle: {
      width: 28,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.textMuted,
    },
  });
