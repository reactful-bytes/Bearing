import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaskRecord } from '../../features/tasks/taskTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { spacing, typography } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { TaskActionMenu } from './TaskActionMenu';
import { TaskSwipeRow } from './TaskSwipeRow';
import { useTaskCompletionAction } from './useTaskCompletionAction';

type TaskListRowProps = {
  task: TaskRecord;
  dateLabel: string;
  onPress: () => void;
  onComplete?: () => void | Promise<void>;
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
  const { complete, working } = useTaskCompletionAction(onComplete, completed);

  return (
    <TaskSwipeRow
      key={task.id}
      completed={completed}
      onComplete={onComplete ? complete : undefined}
      disabled={working}
    >
      <View testID={`task-list-row-${task.id}`} style={styles.row}>
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
            <Text
              numberOfLines={1}
              style={[styles.dateText, completed ? styles.dateCompleted : null]}
            >
              {dateLabel}
            </Text>
          </View>
        </Pressable>

        <TaskActionMenu
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={!completed && onComplete ? complete : undefined}
          onReactivate={completed ? onReactivate : undefined}
        />
      </View>
    </TaskSwipeRow>
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
      paddingVertical: spacing.xs,
    },
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
    dateCompleted: { textDecorationLine: 'line-through' },
    pressed: { opacity: 0.74 },
  });
