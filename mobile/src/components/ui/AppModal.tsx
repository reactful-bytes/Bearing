import { ReactNode, useLayoutEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemedStyles } from '../../design/useThemedStyles';
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { CreateFabGroup } from '../presentation/CreateFabGroup';
import { useCreateFab } from '../presentation/CreateFabContext';

import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type AppModalProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  closeLabel?: string;
  headerAccessory?: ReactNode;
  fullScreen?: boolean;
  hideCloseButton?: boolean;
  hideCreateFab?: boolean;
  safeAreaEdges?: Edge[];
  hideHeader?: boolean;
  centeredHeader?: boolean;
  embedded?: boolean;
  fullScreenEdgeToEdge?: boolean;
  dragToClose?: boolean;
  sheetPaddingBottom?: number;
  children: ReactNode;
};

export function AppModal({
  visible,
  title,
  onClose,
  closeLabel = 'Close',
  headerAccessory,
  fullScreen = false,
  hideCloseButton = false,
  hideCreateFab = false,
  safeAreaEdges,
  hideHeader = false,
  centeredHeader = false,
  embedded = false,
  fullScreenEdgeToEdge = false,
  dragToClose = false,
  sheetPaddingBottom,
  children,
}: AppModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const createFab = useCreateFab();
  const { height: windowHeight } = useWindowDimensions();
  const sheetTranslateY = useSharedValue(0);
  const accessibleTitle = title || 'Modal';
  const sheetPanGesture = Gesture.Pan()
    .enabled(dragToClose)
    .activeOffsetY(8)
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      sheetTranslateY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > 88 || event.velocityY > 700) {
        sheetTranslateY.set(
          withTiming(windowHeight, { duration: 180 }, (finished) => {
            if (finished) runOnJS(onClose)();
          }),
        );
        return;
      }

      sheetTranslateY.set(withSpring(0, { damping: 24, stiffness: 260 }));
    });
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const sheetBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: windowHeight > 0 ? Math.max(0, 1 - sheetTranslateY.value / windowHeight) : 0,
  }));
  useLayoutEffect(() => {
    if (!dragToClose) return;
    cancelAnimation(sheetTranslateY);
    sheetTranslateY.set(0);
  }, [dragToClose, sheetTranslateY, visible]);

  if (embedded) {
    return <>{children}</>;
  }

  // Android renders a translucent window per mounted <Modal>, even when `visible={false}`;
  // keeping closed modals out of the tree avoids stray dark bars stacking behind the tab bar.
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      accessibilityLabel={`${accessibleTitle} modal`}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          accessibilityViewIsModal={!fullScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.backdrop, fullScreen && styles.fullScreenBackdrop]}
        >
          {!fullScreen ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[styles.scrim, dragToClose ? sheetBackdropAnimatedStyle : null]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dismiss ${accessibleTitle}`}
                style={styles.backdropPressArea}
                onPress={onClose}
              />
            </>
          ) : null}
          <Animated.View
            style={[
              styles.sheetMotion,
              fullScreen ? styles.fullScreenMotion : null,
              dragToClose ? sheetAnimatedStyle : null,
            ]}
          >
            <SafeAreaView
              edges={
                safeAreaEdges ??
                (fullScreen
                  ? []
                  : dragToClose
                    ? ['right', 'bottom', 'left']
                    : ['top', 'right', 'bottom', 'left'])
              }
              style={[
                fullScreen ? styles.fullScreenSheet : styles.sheet,
                !fullScreen && dragToClose ? styles.sheetWithDragHandle : null,
                !fullScreen && sheetPaddingBottom !== undefined
                  ? { paddingBottom: sheetPaddingBottom }
                  : null,
              ]}
            >
              {dragToClose ? (
                <GestureDetector gesture={sheetPanGesture}>
                  <View testID="app-modal-drag-handle" style={styles.dragHandleContainer}>
                    <View style={styles.dragHandleTarget}>
                      <View style={styles.dragHandle} />
                    </View>
                  </View>
                </GestureDetector>
              ) : null}
              {!hideHeader ? (
                <View style={[styles.header, centeredHeader ? styles.centeredHeader : null]}>
                  {fullScreen ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${closeLabel} ${accessibleTitle}`}
                      onPress={onClose}
                      style={styles.closeIconButton}
                    >
                      <AppIcon name="back" size={20} decorative />
                    </Pressable>
                  ) : null}
                  {title ? (
                    <Text
                      accessibilityRole="header"
                      accessibilityLabel={title}
                      style={[
                        styles.title,
                        fullScreen && styles.fullScreenTitle,
                        centeredHeader ? styles.centeredHeaderTitle : null,
                      ]}
                    >
                      {title}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.headerActions,
                      centeredHeader ? styles.centeredHeaderActions : null,
                    ]}
                  >
                    {headerAccessory}
                    {!fullScreen && !hideCloseButton ? (
                      <AppButton
                        label={closeLabel}
                        variant="secondary"
                        accessibilityLabel={`${closeLabel} ${accessibleTitle}`}
                        onPress={onClose}
                        style={styles.closeButton}
                        textStyle={styles.closeButtonText}
                      />
                    ) : !centeredHeader ? (
                      <View style={styles.headerPlaceholder} />
                    ) : null}
                  </View>
                </View>
              ) : null}
              <View
                style={[
                  styles.body,
                  fullScreen && styles.fullScreenBody,
                  fullScreen && fullScreenEdgeToEdge ? styles.fullScreenBodyEdgeToEdge : null,
                ]}
              >
                {children}
              </View>
            </SafeAreaView>
          </Animated.View>
          {!fullScreen && !hideCreateFab && createFab?.visible ? (
            <CreateFabGroup
              visible={createFab.visible}
              bottomOffset={insets.bottom + spacing.md}
              rightOffset={spacing.md}
              onPress={createFab.open}
              onDismiss={createFab.dismiss}
              onCreateGoal={() => createFab.create('goal')}
              onCreateTask={() => createFab.create('task')}
              onCreateNote={() => createFab.create('note')}
              onCreateEvent={() => createFab.create('event')}
              onCreateFocus={() => createFab.create('focus')}
            />
          ) : null}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gestureRoot: { flex: 1 },
    sheetMotion: { alignSelf: 'stretch' },
    dragHandleContainer: { alignItems: 'center', marginBottom: -spacing.lg },
    dragHandleTarget: {
      minWidth: 64,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dragHandle: {
      width: 28,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.textMuted,
    },
    backdrop: {
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
    fullScreenBackdrop: {
      backgroundColor: theme.colors.background,
    },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing['2xl'],
      paddingTop: spacing['2xl'],
      paddingBottom: spacing['3xl'],
      gap: spacing.lg,
    },
    sheetWithDragHandle: {
      maxHeight: '100%',
      paddingTop: 0,
      paddingHorizontal: spacing['2xl'],
    },
    fullScreenMotion: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    centeredHeader: { minHeight: 44, justifyContent: 'center', position: 'relative' },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    centeredHeaderActions: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    title: {
      ...typography.screenTitle,
      color: theme.colors.text,
      flex: 1,
    },
    fullScreenTitle: {
      ...typography.label,
      color: theme.colors.brand,
      textAlign: 'center',
    },
    centeredHeaderTitle: {
      ...typography.caption,
      color: theme.colors.brand,
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    closeIconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    headerPlaceholder: {
      width: 44,
      height: 44,
    },
    closeButton: {
      minWidth: 44,
      minHeight: 44,
    },
    closeButtonText: {
      ...typography.helper,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    body: {
      flexShrink: 1,
      minHeight: 0,
      gap: spacing.md,
    },
    fullScreenSheet: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
    },
    fullScreenBody: {
      flex: 1,
    },
    fullScreenBodyEdgeToEdge: {
      marginHorizontal: -spacing.lg,
    },
  });
