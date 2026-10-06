import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaskRecord } from '../../features/tasks/taskTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { TaskActionMenu } from '../tasks/TaskActionMenu';
import { TaskSwipeRow } from '../tasks/TaskSwipeRow';
import { useTaskCompletionAction } from '../tasks/useTaskCompletionAction';

type TaskRowProps = {
  task: TaskRecord;
  onPress: () => void;
  onToggleComplete?: () => void | Promise<void>;
  context?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onReactivate?: () => void;
};

export function TaskRow({
  task,
  onPress,
  onToggleComplete,
  context,
  onEdit,
  onDelete,
  onReactivate,
}: TaskRowProps) {
  const styles = useThemedStyles(createStyles);
  const completed = task.status === 'completed';
  const { complete, working } = useTaskCompletionAction(onToggleComplete, completed);

  return (
    <TaskSwipeRow
      key={task.id}
      completed={completed}
      onComplete={onToggleComplete ? complete : undefined}
      disabled={working}
    >
      <View style={[styles.row, completed ? styles.rowCompleted : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open task ${task.title}`}
          onPress={onPress}
          accessibilityActions={
            onToggleComplete && !completed ? [{ name: 'complete', label: 'Complete task' }] : []
          }
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'complete') complete();
          }}
          style={styles.copy}
        >
          <Text numberOfLines={1} style={[styles.title, completed ? styles.titleCompleted : null]}>
            {task.title}
          </Text>
          {context ? (
            <Text
              numberOfLines={1}
              style={[styles.context, completed ? styles.titleCompleted : null]}
            >
              {context}
            </Text>
          ) : null}
        </Pressable>
        {onEdit && onDelete ? (
          <TaskActionMenu
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onToggleComplete && !completed ? complete : undefined}
            onReactivate={completed ? onReactivate : undefined}
          />
        ) : null}
      </View>
    </TaskSwipeRow>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    rowCompleted: { opacity: 0.68 },
    copy: {
      flex: 1,
      minHeight: theme.layout.minimumTouchTarget,
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    title: { ...theme.typography.helper, color: theme.colors.text, fontWeight: '600' },
    titleCompleted: { textDecorationLine: 'line-through' },
    context: { ...theme.typography.caption, color: theme.colors.textSecondary },
  });
