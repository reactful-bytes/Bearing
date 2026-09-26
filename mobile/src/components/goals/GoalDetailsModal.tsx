import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import {
  GoalDateParts,
  GoalDatePicker,
  buildDefaultGoalDateParts,
  buildGoalDateParts,
  getGoalDateFromParts,
  isTodayOrFutureDate,
} from './GoalDatePicker';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { GoalMilestoneWithTasks, GoalWithMilestones } from '../../features/goals/goalTypes';
import { MilestoneList } from './MilestoneList';

type GoalDetailsModalProps = {
  goal: GoalWithMilestones | null;
  visible: boolean;
  onClose: () => void;
  onSaveGoal: (
    goalId: string,
    fields: { title: string; description: string; estimatedCompletionDate: Date },
  ) => Promise<void>;
  onToggleGoalManualCompletion: (goalId: string, completed: boolean) => Promise<void>;
  onAddMilestone: () => void;
  onOpenMilestone: (milestone: GoalMilestoneWithTasks) => void;
  onToggleMilestoneCompletion: (
    milestone: GoalMilestoneWithTasks,
    completed: boolean,
  ) => Promise<void>;
  onReorderMilestones: (goalId: string, orderedMilestoneIds: string[]) => Promise<void>;
};

function formatDateString(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function GoalDetailsModal({
  goal,
  visible,
  onClose,
  onSaveGoal,
  onToggleGoalManualCompletion,
  onAddMilestone,
  onOpenMilestone,
  onToggleMilestoneCompletion,
  onReorderMilestones,
}: GoalDetailsModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateParts, setDateParts] = useState<GoalDateParts>({ month: 1, day: 1, year: 2026 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!goal || !visible) {
      return;
    }

    setEditMode(false);
    setTitle(goal.title);
    setDescription(goal.description);
    setDateParts(buildGoalDateParts(goal.estimatedCompletionDate));
    setSaving(false);
    setError(null);
  }, [goal, visible]);

  function handleClose(): void {
    setEditMode(false);
    setDateParts(buildDefaultGoalDateParts(today));
    setSaving(false);
    setError(null);
    onClose();
  }

  function updateDate(date: Date): void {
    setDateParts(buildGoalDateParts(date));
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!goal) {
      return;
    }

    if (!title.trim()) {
      setError('Goal name is required.');
      return;
    }

    const parsedDate = getGoalDateFromParts(dateParts);
    if (!isTodayOrFutureDate(parsedDate, today)) {
      setError('Estimated completion date must be today or later.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSaveGoal(goal.id, {
        title: title.trim(),
        description: description.trim(),
        estimatedCompletionDate: parsedDate,
      });
      setEditMode(false);
    } catch {
      setError('Failed to save goal changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleGoalCompletion(completed: boolean): Promise<void> {
    if (!goal) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onToggleGoalManualCompletion(goal.id, completed);
      setEditMode(false);
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : 'Failed to update goal completion.',
      );
    } finally {
      setSaving(false);
    }
  }

  const headerAccessory = goal ? (
    <AppButton
      label={editMode ? 'Cancel' : 'Edit'}
      variant="secondary"
      accessibilityLabel={editMode ? 'Cancel goal editing' : 'Edit goal'}
      onPress={() => {
        setError(null);
        setEditMode((current) => !current);
      }}
      style={styles.headerButton}
      textStyle={styles.headerButtonText}
    />
  ) : null;

  return (
    <AppModal visible={visible} title="Goal Details" onClose={handleClose} fullScreen hideHeader>
      {goal ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top,
              paddingBottom: spacing['3xl'] + insets.bottom,
              paddingHorizontal: 0,
            },
          ]}
        >
          <ScreenHeader
            title="Goal Details"
            onPressBack={handleClose}
            backAccessibilityLabel="Close Goal Details"
            trailing={headerAccessory}
          />
          {editMode ? (
            <View style={styles.section}>
              <FormField
                label="Goal name"
                accessibilityLabel="Edit goal name"
                value={title}
                onChangeText={setTitle}
              />

              <FormField
                label="Description"
                accessibilityLabel="Edit goal description"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <View style={styles.fieldGroup}>
                <GoalDatePicker
                  title="Estimated completion date"
                  accessibilityPrefix="edit goal target"
                  dateParts={dateParts}
                  onSelectDate={updateDate}
                />
              </View>

              <View style={styles.actionColumn}>
                <AppButton
                  label="Save Changes"
                  accessibilityLabel="Save goal changes"
                  onPress={handleSave}
                  loading={saving}
                  loadingLabel="Saving..."
                />

                {goal.status !== 'completed' && goal.status !== 'archived' ? (
                  <AppButton
                    label="Mark Goal Complete"
                    variant="secondary"
                    accessibilityLabel="Mark goal complete"
                    onPress={() => void handleToggleGoalCompletion(true)}
                    loading={saving}
                    loadingLabel="Working..."
                  />
                ) : null}
                {goal.status === 'completed' && goal.manuallyCompletedAt ? (
                  <AppButton
                    label="Reopen Goal"
                    variant="secondary"
                    accessibilityLabel="Reopen goal"
                    onPress={() => void handleToggleGoalCompletion(false)}
                    loading={saving}
                    loadingLabel="Working..."
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <AppCard style={styles.summaryCard}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalDescription}>
                  {goal.description || 'No description yet.'}
                </Text>
                <Text style={styles.metaText}>
                  Target date: {formatDateString(goal.estimatedCompletionDate)}
                </Text>
                <Text style={styles.metaText}>
                  Status: {goal.status[0].toUpperCase() + goal.status.slice(1)}
                </Text>
                <Text style={styles.metaText}>{goal.progressText}</Text>
              </AppCard>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Milestones</Text>
              <AppButton
                label="Add Milestone"
                variant="secondary"
                accessibilityLabel="Add milestone"
                onPress={onAddMilestone}
                style={styles.headerButton}
                textStyle={styles.headerButtonText}
              />
            </View>

            {goal.milestones.length === 0 ? (
              <AppCard style={styles.summaryCard}>
                <Text style={styles.goalDescription}>
                  No milestones yet. Add one to organize this goal’s tasks.
                </Text>
              </AppCard>
            ) : (
              <MilestoneList
                milestones={goal.milestones}
                onOpenMilestone={onOpenMilestone}
                onToggleMilestoneCompletion={(milestone, completed) =>
                  void onToggleMilestoneCompletion(milestone, completed)
                }
                onReorder={(orderedMilestoneIds) =>
                  onReorderMilestones(goal.id, orderedMilestoneIds)
                }
              />
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
      paddingBottom: spacing['3xl'],
    },
    section: {
      gap: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    summaryCard: {
      gap: spacing.sm,
    },
    goalTitle: {
      ...typography.button,
      fontSize: 18,
      color: theme.colors.text,
    },
    goalDescription: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    metaText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    headerButton: {
      minHeight: 44,
    },
    headerButtonText: {
      ...typography.helper,
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    fieldGroup: {
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    input: {
      ...typography.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    textArea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    actionColumn: {
      gap: spacing.md,
    },
    primaryButton: {
      borderRadius: radii.md,
      backgroundColor: theme.colors.brand,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonText: {
      ...typography.button,
      color: theme.colors.surface,
    },
    secondaryButton: {
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    secondaryButtonText: {
      ...typography.button,
      color: theme.colors.textPrimary,
    },
    buttonPressed: {
      opacity: 0.84,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
  });
