import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { GoalMilestoneWithTasks } from '../../features/goals/goalTypes';

type MilestoneListProps = {
  milestones: GoalMilestoneWithTasks[];
  onOpenMilestone: (milestone: GoalMilestoneWithTasks) => void;
  onToggleMilestoneCompletion: (milestone: GoalMilestoneWithTasks, completed: boolean) => void;
  onReorder: (orderedMilestoneIds: string[]) => Promise<void> | void;
};

export function MilestoneList({
  milestones,
  onOpenMilestone,
  onToggleMilestoneCompletion,
  onReorder,
}: MilestoneListProps) {
  const styles = useThemedStyles(createStyles);
  const orderedMilestones = useMemo(
    () => [...milestones].sort((left, right) => left.order - right.order),
    [milestones],
  );

  function moveMilestone(milestoneId: string, direction: -1 | 1): void {
    const index = orderedMilestones.findIndex((milestone) => milestone.id === milestoneId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= orderedMilestones.length) return;
    const ids = orderedMilestones.map((milestone) => milestone.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved);
    void onReorder(ids);
  }

  return (
    <View style={styles.container}>
      {orderedMilestones.map((milestone, index) => {
        const complete = milestone.status === 'completed';
        const manuallyComplete = Boolean(milestone.manuallyCompletedAt);
        const allTasksComplete =
          milestone.totalTaskCount > 0 && milestone.completedTaskCount === milestone.totalTaskCount;
        const canReopen = manuallyComplete && !allTasksComplete;
        const actionLabel = complete
          ? canReopen
            ? 'Reopen'
            : manuallyComplete && allTasksComplete
              ? 'Add Task First'
              : 'Completed'
          : 'Mark Done';

        return (
          <View key={milestone.id} style={styles.rowCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open milestone ${milestone.title}`}
              onPress={() => onOpenMilestone(milestone)}
              style={({ pressed }) => [styles.rowMain, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>{milestone.title}</Text>
              <Text style={styles.rowDescription}>
                {milestone.description || milestone.progressText}
              </Text>
              <Text style={styles.rowProgress}>
                {complete
                  ? 'Completed'
                  : milestone.status === 'in_progress'
                    ? 'In progress'
                    : 'Not started'}
                {` · ${milestone.progressText}`}
              </Text>
            </Pressable>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${actionLabel} milestone ${milestone.title}`}
                disabled={complete && !canReopen}
                onPress={() => onToggleMilestoneCompletion(milestone, !complete)}
                style={[styles.statusButton, complete ? styles.completeButton : null]}
              >
                <Text style={styles.statusText}>{actionLabel}</Text>
              </Pressable>
              <View style={styles.reorderColumn}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move milestone ${milestone.title} up`}
                  disabled={index === 0}
                  onPress={() => moveMilestone(milestone.id, -1)}
                  style={styles.reorderButton}
                >
                  <Text style={styles.reorderText}>↑</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move milestone ${milestone.title} down`}
                  disabled={index === orderedMilestones.length - 1}
                  onPress={() => moveMilestone(milestone.id, 1)}
                  style={styles.reorderButton}
                >
                  <Text style={styles.reorderText}>↓</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: spacing.md },
    rowCard: {
      minHeight: 92,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    rowMain: { flex: 1, minHeight: 44, justifyContent: 'center', gap: spacing.xs },
    pressed: { opacity: 0.82 },
    rowTitle: { ...typography.button, color: theme.colors.text },
    rowDescription: { ...typography.helper, color: theme.colors.textSecondary },
    rowProgress: { ...typography.caption, color: theme.colors.brand },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    statusButton: {
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceBrand,
      paddingHorizontal: spacing.sm,
    },
    completeButton: { backgroundColor: theme.colors.surfaceMuted },
    statusText: { ...typography.caption, color: theme.colors.brand, fontWeight: '700' },
    reorderColumn: { gap: spacing.xs },
    reorderButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    reorderText: { ...typography.button, color: theme.colors.textPrimary },
  });
