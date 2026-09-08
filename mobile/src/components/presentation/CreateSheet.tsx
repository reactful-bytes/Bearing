import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { AppIconName } from '../../design/icons';

type CreateSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onCreateGoal: () => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onCreateEvent: () => void;
};

const createActions: readonly {
  label: string;
  description: string;
  icon: AppIconName;
  tone: 'goal' | 'task' | 'note' | 'event';
  key: keyof Pick<
    CreateSheetProps,
    'onCreateGoal' | 'onCreateTask' | 'onCreateNote' | 'onCreateEvent'
  >;
}[] = [
  {
    label: 'Goal',
    description: 'Define a long-term goal',
    icon: 'goal',
    tone: 'goal',
    key: 'onCreateGoal',
  },
  {
    label: 'Task',
    description: 'Add an actionable task',
    icon: 'task',
    tone: 'task',
    key: 'onCreateTask',
  },
  {
    label: 'Note',
    description: 'Write a note or journal',
    icon: 'note',
    tone: 'note',
    key: 'onCreateNote',
  },
  {
    label: 'Event',
    description: 'Add to your calendar',
    icon: 'calendar',
    tone: 'event',
    key: 'onCreateEvent',
  },
];

export function CreateSheet(props: CreateSheetProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <BottomSheet
      visible={props.visible}
      onDismiss={props.onDismiss}
      accessibilityLabel="Create"
      style={styles.sheet}
    >
      <Text style={styles.title}>Create</Text>
      <View style={styles.actionsPanel}>
        {createActions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={`Create ${action.label}`}
            onPress={props[action.key]}
            style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
          >
            <View style={[styles.iconCircle, styles[`${action.tone}Icon`]]}>
              <AppIcon name={action.icon} size={22} decorative />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.label}>New {action.label}</Text>
              <Text style={styles.description}>{action.description}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sheet: {
      width: '86%',
      maxWidth: 340,
      alignSelf: 'center',
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.cardTitle,
      color: theme.colors.text,
      textAlign: 'center',
    },
    actionsPanel: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    action: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionPressed: { backgroundColor: theme.colors.surfaceBrand },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalIcon: { backgroundColor: theme.colors.success },
    taskIcon: { backgroundColor: theme.colors.brand },
    noteIcon: { backgroundColor: theme.colors.warning },
    eventIcon: { backgroundColor: theme.colors.purple },
    actionCopy: { flex: 1, gap: theme.spacing.xs },
    label: { ...theme.typography.helper, color: theme.colors.text },
    description: { ...theme.typography.caption, color: theme.colors.textSecondary },
  });
