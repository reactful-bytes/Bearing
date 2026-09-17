import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { useTheme } from '../../design/ThemeProvider';
import { AppIcon } from '../ui/AppIcon';
import { AppIconName } from '../../design/icons';

type CreateFabActionKey =
  'onCreateGoal' | 'onCreateTask' | 'onCreateNote' | 'onCreateEvent' | 'onCreateFocus';

type CreateFabGroupProps = {
  visible: boolean;
  bottomOffset: number;
  rightOffset?: number;
  onPress?: () => void;
  onDismiss: () => void;
  onCreateGoal: () => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onCreateEvent: () => void;
  onCreateFocus: () => void;
};

const ACTION_SPACING = 64;
const ANIMATION_DURATION_MS = 200;
const FAB_PLUS_STROKE_WIDTH = 2.75;

// Declared in on-screen "stack" order (top to bottom); the last entry renders closest to the button.
const createFabActions: readonly {
  label: string;
  icon: AppIconName;
  tone: 'goal' | 'task' | 'note' | 'event' | 'focus';
  key: CreateFabActionKey;
}[] = [
  { label: 'Event', icon: 'calendar', tone: 'event', key: 'onCreateEvent' },
  { label: 'Note', icon: 'note', tone: 'note', key: 'onCreateNote' },
  { label: 'Task', icon: 'task', tone: 'task', key: 'onCreateTask' },
  { label: 'Goal', icon: 'goal', tone: 'goal', key: 'onCreateGoal' },
  { label: 'Focus', icon: 'focusMode', tone: 'focus', key: 'onCreateFocus' },
];

export function CreateFabGroup(props: CreateFabGroupProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: props.visible ? 1 : 0,
      duration: ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [progress, props.visible]);

  return (
    <>
      {props.visible ? (
        <Animated.View
          testID="create-fab-backdrop"
          accessibilityLabel="Dismiss create menu"
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={props.onDismiss} />
        </Animated.View>
      ) : null}
      <View
        pointerEvents="box-none"
        style={[styles.container, { bottom: props.bottomOffset, right: props.rightOffset }]}
        testID="create-fab-group"
      >
        {createFabActions.map((action, index) => {
          const distanceFromButton = createFabActions.length - index;
          const translateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(distanceFromButton * ACTION_SPACING)],
          });

          return (
            <Animated.View
              key={action.key}
              pointerEvents={props.visible ? 'box-none' : 'none'}
              style={[styles.actionRow, { transform: [{ translateY }], opacity: progress }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Create ${action.label}`}
                onPress={props[action.key]}
                style={({ pressed }) => [
                  styles.labelContainer,
                  pressed ? styles.actionPressed : null,
                ]}
              >
                <Text style={styles.label}>{action.label}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Create ${action.label}`}
                onPress={props[action.key]}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles[`${action.tone}Action`],
                  pressed ? styles.actionPressed : null,
                ]}
              >
                <AppIcon name={action.icon} size={22} color={theme.colors.onBrand} decorative />
              </Pressable>
            </Animated.View>
          );
        })}
        <Animated.View style={[styles.closeRow, { opacity: 1 }]}>
          <Pressable
            testID="create-fab-close"
            accessibilityRole="button"
            accessibilityLabel={props.visible ? 'Close create menu' : 'Create'}
            accessibilityState={{ expanded: props.visible }}
            onPress={props.visible ? props.onDismiss : (props.onPress ?? props.onDismiss)}
            style={({ pressed }) => [
              styles.closeButton,
              props.visible ? styles.closeButtonExpanded : null,
              props.visible ? null : styles.closeButtonClosed,
              pressed ? styles.actionPressed : null,
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.94],
                    }),
                  },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                ],
              }}
            >
              <AppIcon
                name="create"
                size={22}
                strokeWidth={FAB_PLUS_STROKE_WIDTH}
                color={props.visible ? theme.colors.text : theme.colors.onBrand}
                decorative
              />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      width: 56,
      height: 56,
      alignItems: 'flex-end',
    },
    backdrop: {
      backgroundColor: 'rgba(2, 6, 14, 0.72)',
    },
    actionRow: {
      position: 'absolute',
      bottom: 10,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    labelContainer: {
      minWidth: 96,
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -20,
      paddingRight: theme.spacing.xl,
      zIndex: 0,
    },
    label: {
      ...theme.typography.button,
      color: theme.colors.text,
      textAlign: 'right',
    },
    closeRow: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      alignItems: 'flex-end',
    },
    actionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    closeButton: {
      width: 56,
      height: 56,
      borderRadius: 32,
      backgroundColor: theme.colors.brand,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      bottom: 0,
      boxShadow: '0px 4px 8px rgba(6, 18, 32, 0.26)',
    },
    closeButtonExpanded: {
      backgroundColor: theme.colors.background,
    },
    closeButtonClosed: {
      backgroundColor: theme.colors.brand,
      borderWidth: 0,
    },
    actionPressed: { opacity: 0.85 },
    goalAction: { backgroundColor: theme.colors.success },
    taskAction: { backgroundColor: theme.colors.brand },
    noteAction: { backgroundColor: theme.colors.warning },
    eventAction: { backgroundColor: theme.colors.purple },
    focusAction: { backgroundColor: theme.colors.focusGreen },
  });
