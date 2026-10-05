import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalWithMilestones } from '../../features/goals/goalTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { radii, spacing, typography } from '../../design/tokens';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { TaskHierarchyRow } from './TaskHierarchyRow';

type TaskAssociation = {
  goalId: string | null;
  milestoneId: string | null;
};

type TaskAssociationSelectorProps = TaskAssociation & {
  goals: readonly GoalWithMilestones[];
  goalsLoading?: boolean;
  allowedDraftGoalId?: string | null;
  onChange: (association: TaskAssociation) => void;
};

export function TaskAssociationSelector({
  goals,
  goalsLoading = false,
  allowedDraftGoalId = null,
  goalId,
  milestoneId,
  onChange,
}: TaskAssociationSelectorProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(() => new Set());

  const selectedGoal = goals.find((goal) => goal.id === goalId) ?? null;
  const selectedMilestone =
    selectedGoal?.milestones.find((milestone) => milestone.id === milestoneId) ?? null;
  const selectedLabel = selectedGoal
    ? selectedMilestone
      ? `Milestone · ${selectedMilestone.title}`
      : `Goal · ${selectedGoal.title}`
    : goalId
      ? 'Linked goal unavailable'
      : 'No goal or milestone';
  const selectedDetail = selectedMilestone && selectedGoal ? `In ${selectedGoal.title}` : null;

  const visibleGoals = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return goals.filter((goal) => {
      if (goal.status === 'draft' && goal.id !== allowedDraftGoalId) return false;
      if (!normalizedSearch) return true;
      return (
        goal.title.toLocaleLowerCase().includes(normalizedSearch) ||
        goal.milestones.some((milestone) =>
          milestone.title.toLocaleLowerCase().includes(normalizedSearch),
        )
      );
    });
  }, [allowedDraftGoalId, goals, search]);

  function closeSelector(): void {
    setSearch('');
    setVisible(false);
  }

  function openSelector(): void {
    setExpandedGoalIds(goalId ? new Set([goalId]) : new Set());
    setVisible(true);
  }

  function select(association: TaskAssociation): void {
    onChange(association);
    closeSelector();
  }

  return (
    <>
      <View style={styles.field}>
        <View style={styles.fieldCopy}>
          <Text style={styles.fieldLabel}>Link to</Text>
          <Text
            accessibilityLabel={`Task goal or milestone: ${selectedLabel}`}
            numberOfLines={2}
            style={styles.fieldValue}
          >
            {selectedLabel}
          </Text>
          {selectedDetail ? <Text style={styles.fieldDetail}>{selectedDetail}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose task goal or milestone, currently ${selectedLabel}`}
          onPress={openSelector}
          style={({ pressed }) => [styles.chooseButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.chooseButtonText}>Change</Text>
        </Pressable>
      </View>

      <AppModal visible={visible} onClose={closeSelector} fullScreen hideHeader>
        <View style={[styles.selectorContent, { paddingTop: insets.top }]}>
          <ScreenHeader
            title="Link Task"
            onPressBack={closeSelector}
            backAccessibilityLabel="Back to task"
          />
          <FormField
            label="Search goals and milestones"
            accessibilityLabel="Search goals and milestones"
            value={search}
            onChangeText={setSearch}
            placeholder="Find a goal or milestone"
            autoCapitalize="none"
          />
          <ScrollView
            testID="task-association-options-scroll"
            style={styles.optionScroll}
            contentContainerStyle={[
              styles.optionList,
              { paddingBottom: spacing.xl + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <TaskHierarchyRow
              title="No goal or milestone"
              kind="unlinked"
              detail="Keep this task independent"
              selected={!goalId}
              onPress={() => select({ goalId: null, milestoneId: null })}
              accessibilityLabel="Link task to no goal or milestone"
            />

            {visibleGoals.map((goal) => (
              <View key={goal.id}>
                <TaskHierarchyRow
                  title={goal.title}
                  kind="goal"
                  detail={`${goal.status === 'active' ? 'Active' : goal.status} goal · ${goal.milestones.length} ${goal.milestones.length === 1 ? 'milestone' : 'milestones'}`}
                  selected={goalId === goal.id && !milestoneId}
                  accessibilityLabel={`Link task to goal ${goal.title}`}
                  onPress={() => select({ goalId: goal.id, milestoneId: null })}
                  expanded={search.trim().length > 0 || expandedGoalIds.has(goal.id)}
                  onToggleExpanded={() =>
                    setExpandedGoalIds((current) => {
                      const next = new Set(current);
                      if (next.has(goal.id)) next.delete(goal.id);
                      else next.add(goal.id);
                      return next;
                    })
                  }
                />
                {(search.trim().length > 0 || expandedGoalIds.has(goal.id)
                  ? goal.milestones.filter(
                      (milestone) =>
                        !search.trim() ||
                        goal.title
                          .toLocaleLowerCase()
                          .includes(search.trim().toLocaleLowerCase()) ||
                        milestone.title
                          .toLocaleLowerCase()
                          .includes(search.trim().toLocaleLowerCase()),
                    )
                  : []
                ).map((milestone) => (
                  <TaskHierarchyRow
                    key={milestone.id}
                    title={milestone.title}
                    kind="milestone"
                    nested
                    detail={`Milestone in ${goal.title}`}
                    selected={goalId === goal.id && milestoneId === milestone.id}
                    accessibilityLabel={`Link task to milestone ${milestone.title} in ${goal.title}`}
                    onPress={() => select({ goalId: goal.id, milestoneId: milestone.id })}
                  />
                ))}
              </View>
            ))}

            {goalsLoading && goals.length === 0 ? (
              <Text style={styles.emptyDescription}>Loading goals…</Text>
            ) : null}
            {!goalsLoading && visibleGoals.length === 0 && !goalId ? (
              <Text style={styles.emptyDescription}>
                {goals.length === 0 ? 'No goals yet.' : 'No matching goals or milestones.'}
              </Text>
            ) : null}
            {selectedGoal && !visibleGoals.some((goal) => goal.id === selectedGoal.id) ? (
              <TaskHierarchyRow
                title={
                  selectedMilestone
                    ? `${selectedGoal.title} / ${selectedMilestone.title}`
                    : selectedGoal.title
                }
                kind={selectedMilestone ? 'milestone' : 'goal'}
                nested={Boolean(selectedMilestone)}
                detail="Current link not in available goals"
                accessibilityLabel={`Keep current task link to ${selectedLabel}`}
                onPress={() =>
                  select({ goalId: selectedGoal.id, milestoneId: selectedMilestone?.id ?? null })
                }
              />
            ) : null}
          </ScrollView>
        </View>
      </AppModal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      minHeight: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    fieldCopy: { flex: 1, gap: spacing.xs },
    fieldLabel: { ...typography.caption, color: theme.colors.textSecondary },
    fieldValue: { ...typography.body, color: theme.colors.text },
    fieldDetail: { ...typography.caption, color: theme.colors.textSecondary },
    chooseButton: {
      minHeight: theme.layout.minimumTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    chooseButtonText: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    selectorContent: { flex: 1, gap: spacing.lg },
    optionScroll: { flex: 1, marginRight: -spacing.lg },
    optionList: { gap: spacing.xs, paddingRight: spacing.lg, paddingBottom: spacing.xl },
    emptyDescription: {
      ...typography.body,
      color: theme.colors.textSecondary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    pressed: { opacity: 0.76 },
  });
