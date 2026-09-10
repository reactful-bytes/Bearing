import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { useTheme } from '../../design/ThemeProvider';
import { AppIcon } from '../ui/AppIcon';
import { AppIconName } from '../../design/icons';

type CreateFabActionKey = 'onCreateGoal' | 'onCreateTask' | 'onCreateNote' | 'onCreateEvent';

type CreateFabGroupProps = {
  visible: boolean;
  bottomOffset: number;
  onDismiss: () => void;
  onCreateGoal: () => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onCreateEvent: () => void;
};

const ACTION_SPACING = 62;
const ANIMATION_DURATION_MS = 200;

const createFabActions: readonly {
  label: string;
  icon: AppIconName;
  tone: 'goal' | 'task' | 'note' | 'event';
  key: CreateFabActionKey;
}[] = [
  { label: 'Event', icon: 'calendar', tone: 'event', key: 'onCreateEvent' },
  { label: 'Note', icon: 'note', tone: 'note', key: 'onCreateNote' },
  { label: 'Task', icon: 'task', tone: 'task', key: 'onCreateTask' },
  { label: 'Goal', icon: 'goal', tone: 'goal', key: 'onCreateGoal' },
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
        <Pressable
          testID="create-fab-backdrop"
          accessibilityLabel="Dismiss create menu"
          style={StyleSheet.absoluteFill}
          onPress={props.onDismiss}
        />
      ) : null}
      <View
        pointerEvents="box-none"
        style={[styles.container, { bottom: props.bottomOffset }]}
        testID="create-fab-group"
      >
        {createFabActions.map((action, index) => {
          const translateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -((index + 1) * ACTION_SPACING)],
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
    actionRow: {
      position: 'absolute',
      bottom: 0,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    label: {
      ...theme.typography.helper,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      overflow: 'hidden',
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
  });
