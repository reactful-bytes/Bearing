import { useEffect, useRef } from 'react';
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
  onDismiss: () => void;
  onCreateGoal: () => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onCreateEvent: () => void;
  onCreateFocus: () => void;
};

const ACTION_SPACING = 70;
const ANIMATION_DURATION_MS = 200;

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
  const progress = useRef(new Animated.Value(0)).current;

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
        style={[styles.container, { bottom: props.bottomOffset }]}
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
        {props.visible ? (
          <Animated.View style={[styles.closeRow, { opacity: progress }]}>
            <Pressable
              testID="create-fab-close"
              accessibilityRole="button"
              accessibilityLabel="Close create menu"
              onPress={props.onDismiss}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.actionPressed : null]}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '45deg'],
                      }),
                    },
                  ],
                }}
              >
                <AppIcon name="create" size={22} color={theme.colors.text} decorative />
              </Animated.View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    backdrop: {
      backgroundColor: 'rgba(2, 6, 14, 0.72)',
    },
    actionRow: {
      position: 'absolute',
      bottom: -50,
      left: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelContainer: {
      minWidth: 96,
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
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
      bottom: 28,
      left: 0,
      right: 0,
      alignItems: 'center',
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
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      bottom: -94,
    },
    actionPressed: { opacity: 0.85 },
    goalAction: { backgroundColor: theme.colors.success },
    taskAction: { backgroundColor: theme.colors.brand },
    noteAction: { backgroundColor: theme.colors.warning },
    eventAction: { backgroundColor: theme.colors.purple },
    focusAction: { backgroundColor: theme.colors.focusGreen },
  });
