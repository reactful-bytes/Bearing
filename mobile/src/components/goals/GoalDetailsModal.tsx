import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import {
  GoalDateField,
  GoalDateParts,
  GoalDatePicker,
  MONTH_OPTIONS,
  YEAR_OPTION_COUNT,
  buildDefaultGoalDateParts,
  buildGoalDateParts,
  formatGoalDateParts,
  formatTwoDigits,
  getDayOptions,
  getGoalDateFromParts,
  isFutureDate,
} from './GoalDatePicker';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { GoalStepRecord, GoalWithSteps } from '../../features/goals/goalTypes';
import { DraggableStepList } from './DraggableStepList';

type GoalDetailsModalProps = {
  goal: GoalWithSteps | null;
  visible: boolean;
  onClose: () => void;
  onSaveGoal: (
    goalId: string,
    fields: { title: string; description: string; estimatedCompletionDate: Date },
  ) => Promise<void>;
  onMarkGoalCompleted: (goalId: string) => Promise<void>;
  onAddStep: () => void;
  onOpenStep: (step: GoalStepRecord) => void;
  onToggleStepStatus: (step: GoalStepRecord) => Promise<void>;
  onReorderSteps: (goalId: string, orderedStepIds: string[]) => Promise<void>;
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
  onMarkGoalCompleted,
  onAddStep,
  onOpenStep,
  onToggleStepStatus,
  onReorderSteps,
}: GoalDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateParts, setDateParts] = useState<GoalDateParts>({ month: 1, day: 1, year: 2026 });
  const [activeDateField, setActiveDateField] = useState<GoalDateField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_OPTION_COUNT }, (_, index) => today.getFullYear() + index),
    [today],
  );
  const dayOptions = useMemo(
    () => getDayOptions(dateParts.month, dateParts.year),
    [dateParts.month, dateParts.year],
  );

  useEffect(() => {
    if (!goal || !visible) {
      return;
    }

    setEditMode(false);
    setTitle(goal.title);
    setDescription(goal.description);
    setDateParts(buildGoalDateParts(goal.estimatedCompletionDate));
    setActiveDateField(null);
    setSaving(false);
    setError(null);
  }, [goal, visible]);

  function handleClose(): void {
    setEditMode(false);
    setDateParts(buildDefaultGoalDateParts(today));
    setActiveDateField(null);
    setSaving(false);
    setError(null);
    onClose();
  }

  function updateDateField(field: GoalDateField, value: number): void {
    setDateParts((current) => {
      const next = { ...current, [field]: value };
      const validDays = getDayOptions(next.month, next.year);

      if (!validDays.includes(next.day)) {
        next.day = validDays[validDays.length - 1];
      }

      return next;
    });
    setActiveDateField(null);
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
    if (!isFutureDate(parsedDate, today)) {
      setError('Estimated completion date must be in the future.');
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

  async function handleMarkComplete(): Promise<void> {
    if (!goal) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onMarkGoalCompleted(goal.id);
      setEditMode(false);
    } catch {
      setError('Failed to mark goal complete.');
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
    <AppModal
      visible={visible}
      title="Goal Details"
      onClose={handleClose}
      headerAccessory={headerAccessory}
    >
      {goal ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
                  summaryLabel={`Selected date: ${formatGoalDateParts(dateParts)}`}
                  helperText="Format: MM-DD-YYYY"
                  accessibilityPrefix="edit goal target"
                  dateParts={dateParts}
                  activeField={activeDateField}
                  optionsByField={{
                    month: MONTH_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                    day: dayOptions.map((day) => ({ value: day, label: formatTwoDigits(day) })),
                    year: yearOptions.map((year) => ({ value: year, label: String(year) })),
                  }}
                  onToggleField={(field) =>
                    setActiveDateField((current) => (current === field ? null : field))
                  }
                  onSelectField={updateDateField}
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

                {goal.status !== 'completed' ? (
                  <AppButton
                    label="Mark Goal Complete"
                    variant="secondary"
                    accessibilityLabel="Mark goal complete"
                    onPress={handleMarkComplete}
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
                  Status: {goal.status === 'completed' ? 'Completed' : 'Active'}
                </Text>
                <Text style={styles.metaText}>{goal.progressText}</Text>
              </AppCard>
            </View>
          )}

          {goal.aiMilestones && goal.aiMilestones.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Milestones</Text>
              {goal.aiMilestones.map((milestone, index) => (
                <AppCard key={`goal-milestone-${index + 1}`} style={styles.summaryCard}>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  <Text style={styles.goalDescription}>{milestone.description}</Text>
                </AppCard>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Steps</Text>
              <AppButton
                label="Add Step"
                variant="secondary"
                accessibilityLabel="Add step"
                onPress={onAddStep}
                style={styles.headerButton}
                textStyle={styles.headerButtonText}
              />
            </View>

            {goal.steps.length === 0 ? (
              <AppCard style={styles.summaryCard}>
                <Text style={styles.goalDescription}>
                  No steps yet. Add the first action for this goal.
                </Text>
              </AppCard>
            ) : (
              <DraggableStepList
                steps={goal.steps}
                onOpenStep={onOpenStep}
                onToggleStepStatus={(step) => void onToggleStepStatus(step)}
                onReorder={(orderedStepIds) => onReorderSteps(goal.id, orderedStepIds)}
              />
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexShrink: 1,
  },
  content: {
    gap: spacing.lg,
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
    color: colors.text,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  goalTitle: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
  },
  milestoneTitle: {
    ...typography.button,
    color: colors.text,
  },
  goalDescription: {
    ...typography.body,
    color: colors.textPrimary,
  },
  metaText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  headerButton: {
    minHeight: 44,
  },
  headerButtonText: {
    ...typography.helper,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  secondaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
});
