import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaskRecord } from '../../features/tasks/taskTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { radii, spacing, typography } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { TaskActionMenu } from './TaskActionMenu';

type TaskListRowProps = {
  task: TaskRecord;
  dateLabel: string;
  onPress: () => void;
  onComplete?: () => void;
  onReactivate?: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskListRow({
  task,
  dateLabel,
  onPress,
  onComplete,
  onReactivate,
  onEdit,
  onDelete,
}: TaskListRowProps) {
  const styles = useThemedStyles(createStyles);
  const completed = task.status === 'completed';

  return (
    <View style={styles.row}>
      {onComplete ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${task.title} complete`}
          accessibilityState={{ checked: completed, disabled: completed }}
          disabled={completed}
          onPress={onComplete}
          style={({ pressed }) => [styles.completeButton, pressed ? styles.pressed : null]}
        >
          <AppIcon name="none" size={20} color={styles.incompleteIcon.color} decorative />
        </Pressable>
      ) : (
        <View style={styles.completeButton}>
          <AppIcon
            name={completed ? 'complete' : 'none'}
            size={20}
            color={completed ? styles.completeIcon.color : styles.incompleteIcon.color}
            decorative
          />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open task ${task.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.copy, pressed ? styles.pressed : null]}
      >
        <Text numberOfLines={2} style={[styles.title, completed ? styles.titleCompleted : null]}>
          {task.title}
        </Text>
        <View style={styles.dateRow}>
          <AppIcon name="date" size={14} color={styles.dateIcon.color} decorative />
          <Text numberOfLines={1} style={styles.dateText}>
            {dateLabel}
          </Text>
        </View>
      </Pressable>

      <TaskActionMenu onEdit={onEdit} onDelete={onDelete} onReactivate={onReactivate} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 56,
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      paddingVertical: spacing.xs,
    },
    completeButton: {
      width: 36,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    incompleteIcon: { color: theme.colors.textSecondary },
    completeIcon: { color: theme.colors.success },
    copy: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 0,
    },
    dateIcon: { color: theme.colors.textSecondary },
    dateText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      flex: 1,
      flexShrink: 1,
    },
    title: {
      ...typography.helper,
      color: theme.colors.text,
      fontWeight: '600',
      flexShrink: 1,
    },
    titleCompleted: { color: theme.colors.textSecondary, textDecorationLine: 'line-through' },
    pressed: { opacity: 0.74 },
  });
