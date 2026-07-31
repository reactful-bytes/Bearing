import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
import { GoalStepRecord } from '../../features/goals/goalTypes';

type DraggableStepListProps = {
  steps: GoalStepRecord[];
  onOpenStep: (step: GoalStepRecord) => void;
  onToggleStepStatus: (step: GoalStepRecord) => void;
  onReorder: (orderedStepIds: string[]) => Promise<void> | void;
};

export function DraggableStepList({
  steps,
  onOpenStep,
  onToggleStepStatus,
  onReorder,
}: DraggableStepListProps) {
  const sortedSteps = useMemo(
    () => [...steps].sort((left, right) => left.order - right.order),
    [steps],
  );
  function moveStep(stepId: string, direction: -1 | 1): void {
    const currentIndex = sortedSteps.findIndex((step) => step.id === stepId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedSteps.length) {
      return;
    }

    const nextIds = sortedSteps.map((step) => step.id);
    const [movedId] = nextIds.splice(currentIndex, 1);
    nextIds.splice(targetIndex, 0, movedId);
    void onReorder(nextIds);
  }

  return (
    <View style={styles.container}>
      {sortedSteps.map((step, index) => {
        const completed = step.status === 'completed';
        const canMoveUp = index > 0;
        const canMoveDown = index < sortedSteps.length - 1;

        return (
          <View key={step.id} style={styles.rowShell}>
            <View style={styles.rowCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${step.title}`}
                onPress={() => onOpenStep(step)}
                style={({ pressed }) => [styles.rowMain, pressed ? styles.rowMainPressed : null]}
              >
                <Text style={[styles.rowTitle, completed ? styles.completedText : null]}>
                  {step.title}
                </Text>
                <Text style={[styles.rowDescription, completed ? styles.completedText : null]}>
                  {step.description || step.starter || 'No extra details yet.'}
                </Text>
              </Pressable>

              <View style={styles.statusColumn}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    completed ? `Mark ${step.title} pending` : `Mark ${step.title} complete`
                  }
                  onPress={() => onToggleStepStatus(step)}
                  style={({ pressed }) => [
                    styles.statusButton,
                    completed ? styles.statusButtonCompleted : null,
                    pressed ? styles.statusButtonPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      completed ? styles.statusButtonCompletedText : null,
                    ]}
                  >
                    {completed ? 'Completed' : 'Mark Done'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.moveColumn}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${step.title} up`}
                  disabled={!canMoveUp}
                  onPress={() => moveStep(step.id, -1)}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && canMoveUp ? styles.statusButtonPressed : null,
                    !canMoveUp ? styles.moveButtonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.moveButtonText,
                      !canMoveUp ? styles.moveButtonTextDisabled : null,
                    ]}
                  >
                    ↑
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${step.title} down`}
                  disabled={!canMoveDown}
                  onPress={() => moveStep(step.id, 1)}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && canMoveDown ? styles.statusButtonPressed : null,
                    !canMoveDown ? styles.moveButtonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.moveButtonText,
                      !canMoveDown ? styles.moveButtonTextDisabled : null,
                    ]}
                  >
                    ↓
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  rowShell: {
    minHeight: 104,
  },
  rowCard: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  rowMainPressed: {
    opacity: 0.82,
  },
  rowTitle: {
    ...typography.button,
    color: colors.text,
  },
  rowDescription: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  completedText: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  statusColumn: {
    justifyContent: 'center',
  },
  moveColumn: {
    width: 44,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statusButton: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusButtonCompleted: {
    backgroundColor: colors.surfaceMuted,
  },
  statusButtonPressed: {
    opacity: 0.84,
  },
  statusButtonText: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '700',
  },
  statusButtonCompletedText: {
    color: colors.textSecondary,
  },
  moveButton: {
    minWidth: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButtonDisabled: {
    opacity: 0.45,
  },
  moveButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  moveButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
