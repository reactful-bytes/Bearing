import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { useTheme } from '../../design/ThemeProvider';
import { AppIcon } from '../ui/AppIcon';
import { AppIconName } from '../../design/icons';

type CreateFabActionKey =
  | 'onCreateGoal'
  | 'onCreateTask'
  | 'onCreateNote'
  | 'onCreateEvent'
  | 'onCreateFocus';

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

const ACTION_SPACING = 62;
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
              pointerEvents={props.visible ? 'auto' : 'none'}
              style={[styles.actionRow, { transform: [{ translateY }], opacity: progress }]}
            >
              <Text style={styles.label}>{action.label}</Text>
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
      bottom: 0,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    label: {
      ...theme.typography.button,
      color: theme.colors.text,
    },
    actionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionPressed: { opacity: 0.85 },
    goalAction: { backgroundColor: theme.colors.success },
    taskAction: { backgroundColor: theme.colors.brand },
    noteAction: { backgroundColor: theme.colors.warning },
    eventAction: { backgroundColor: theme.colors.purple },
    focusAction: { backgroundColor: theme.colors.focusGreen },
  });
