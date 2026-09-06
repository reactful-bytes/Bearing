import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaskRecord } from '../../features/tasks/taskTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';

type TaskRowProps = {
  task: TaskRecord;
  onPress: () => void;
  onToggleComplete: () => void;
  context?: string;
};

export function TaskRow({ task, onPress, onToggleComplete, context }: TaskRowProps) {
  const styles = useThemedStyles(createStyles);
  const completed = task.status === 'completed';

  return (
    <View style={[styles.row, completed ? styles.rowCompleted : null]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${task.title} ${completed ? 'incomplete' : 'complete'}`}
        accessibilityState={{ checked: completed }}
        onPress={onToggleComplete}
        style={styles.toggle}
      >
        <AppIcon
          name="task"
          size={20}
          color={completed ? styles.toggleComplete.color : styles.toggle.color}
          decorative
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open task ${task.title}`}
        onPress={onPress}
        style={styles.copy}
      >
        <Text numberOfLines={1} style={[styles.title, completed ? styles.titleCompleted : null]}>
          {task.title}
        </Text>
        {context ? (
          <Text numberOfLines={1} style={styles.context}>
            {context}
          </Text>
        ) : null}
      </Pressable>
    </View>
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
    toggle: {
      width: theme.layout.minimumTouchTarget,
      height: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: theme.radii.md,
      borderColor: theme.colors.border,
      color: theme.colors.textSecondary,
    },
    toggleComplete: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.success,
      color: theme.colors.onBrand,
    },
    copy: {
      flex: 1,
      minHeight: theme.layout.minimumTouchTarget,
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    title: { ...theme.typography.cardTitle, color: theme.colors.text },
    titleCompleted: { textDecorationLine: 'line-through' },
    context: { ...theme.typography.caption, color: theme.colors.textSecondary },
  });
