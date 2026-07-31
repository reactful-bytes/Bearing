import { useMemo, useState } from 'react';
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
  formatGoalDateParts,
  formatTwoDigits,
  getDayOptions,
  getGoalDateFromParts,
  isFutureDate,
} from './GoalDatePicker';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { CreateGoalInput, CreateGoalStepInput } from '../../features/goals/goalTypes';

type CreateGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalInput) => Promise<void>;
  hasPremiumAccess: boolean;
  isPremiumStatusResolved: boolean;
  onOpenPremiumPaywall: () => void;
};

type DraftGoalStep = CreateGoalStepInput & {
  id: string;
  dateParts: GoalDateParts;
  activeDateField: GoalDateField | null;
};

const WIZARD_TITLES = [
  'SMART Setup',
  'Goal Details',
  'Target Date',
  'AI Planning',
  'Steps',
] as const;

function makeEmptyDraftStep(index: number, baseDate: Date): DraftGoalStep {
  const defaultDateParts = buildDefaultGoalDateParts(baseDate);

  return {
    id: `draft-step-${index}`,
    title: '',
    description: '',
    starter: '',
    estimatedFinishDate: getGoalDateFromParts(defaultDateParts),
    dateParts: defaultDateParts,
    activeDateField: null,
  };
}

export function CreateGoalModal({
  visible,
  onClose,
  onSave,
  hasPremiumAccess,
  isPremiumStatusResolved,
  onOpenPremiumPaywall,
}: CreateGoalModalProps) {
  const today = useMemo(() => new Date(), []);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalDateParts, setGoalDateParts] = useState<GoalDateParts>(() =>
    buildDefaultGoalDateParts(today),
  );
  const [activeGoalDateField, setActiveGoalDateField] = useState<GoalDateField | null>(null);
  const [draftSteps, setDraftSteps] = useState<DraftGoalStep[]>([makeEmptyDraftStep(1, today)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGoBack = wizardIndex > 0;
  const wizardLabel = useMemo(
    () => `Step ${wizardIndex + 1} of ${WIZARD_TITLES.length}: ${WIZARD_TITLES[wizardIndex]}`,
    [wizardIndex],
  );

  function resetForm(): void {
    setWizardIndex(0);
    setTitle('');
    setDescription('');
    setGoalDateParts(buildDefaultGoalDateParts(today));
    setActiveGoalDateField(null);
    setDraftSteps([makeEmptyDraftStep(1, today)]);
    setSaving(false);
    setError(null);
  }

  function handleClose(): void {
    resetForm();
    onClose();
  }

  function updateDraftStep(id: string, field: keyof DraftGoalStep, value: string): void {
    setDraftSteps((current) =>
      current.map((step) => {
        if (step.id !== id) {
          return step;
        }

        return { ...step, [field]: value };
      }),
    );
  }

  function toggleDraftStepDateField(id: string, field: GoalDateField): void {
    setDraftSteps((current) =>
      current.map((step) => {
        if (step.id !== id) {
          return {
            ...step,
            activeDateField: null,
          };
        }

        return {
          ...step,
          activeDateField: step.activeDateField === field ? null : field,
        };
      }),
    );
    setError(null);
  }

  function updateDraftStepDateField(id: string, field: GoalDateField, value: number): void {
    setDraftSteps((current) =>
      current.map((step) => {
        if (step.id !== id) {
          return {
            ...step,
            activeDateField: null,
          };
        }

        const nextDateParts = { ...step.dateParts, [field]: value };
        const validDays = getDayOptions(nextDateParts.month, nextDateParts.year);

        if (!validDays.includes(nextDateParts.day)) {
          nextDateParts.day = validDays[validDays.length - 1];
        }

        return {
          ...step,
          dateParts: nextDateParts,
          estimatedFinishDate: getGoalDateFromParts(nextDateParts),
          activeDateField: null,
        };
      }),
    );
    setError(null);
  }

  function updateGoalDateField(field: GoalDateField, value: number): void {
    setGoalDateParts((current) => {
      const next = { ...current, [field]: value };
      const validDays = getDayOptions(next.month, next.year);

      if (!validDays.includes(next.day)) {
        next.day = validDays[validDays.length - 1];
      }

      return next;
    });
    setActiveGoalDateField(null);
    setError(null);
  }

  function validateCurrentStep(): boolean {
    setError(null);

    if (wizardIndex === 1) {
      if (!title.trim()) {
        setError('Goal name is required.');
        return false;
      }
    }

    if (wizardIndex === 2) {
      const selectedDate = getGoalDateFromParts(goalDateParts);
      if (!isFutureDate(selectedDate, today)) {
        setError('Estimated completion date must be in the future.');
        return false;
      }
    }

    if (wizardIndex === 4) {
      const filledSteps = draftSteps.filter((step) => step.title.trim());
      if (filledSteps.length === 0) {
        setError('Add at least one step with a name.');
        return false;
      }

      const invalidStepIndex = filledSteps.findIndex(
        (step) => !step.estimatedFinishDate || !isFutureDate(step.estimatedFinishDate, today),
      );

      if (invalidStepIndex !== -1) {
        setError(`Step ${invalidStepIndex + 1} estimated finish date must be in the future.`);
        return false;
      }
    }

    return true;
  }

  function handleNext(): void {
    if (!validateCurrentStep()) {
      return;
    }

    setWizardIndex((current) => Math.min(current + 1, WIZARD_TITLES.length - 1));
  }

  async function handleSave(): Promise<void> {
    if (!validateCurrentStep()) {
      return;
    }

    const parsedDate = getGoalDateFromParts(goalDateParts);
    if (!isFutureDate(parsedDate, today)) {
      setError('Estimated completion date must be in the future.');
      return;
    }

    setActiveGoalDateField(null);

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        smartMeta: {
          specific: '',
          measurable: '',
          achievable: '',
          relevant: '',
          timeBound: '',
        },
        estimatedCompletionDate: parsedDate,
        isAiAssisted: false,
        steps: draftSteps
          .filter((step) => step.title.trim())
          .map((step) => ({
            title: step.title.trim(),
            description: step.description.trim(),
            starter: step.starter.trim(),
            estimatedFinishDate: step.estimatedFinishDate,
          })),
      });
      handleClose();
    } catch {
      setError('Failed to save goal. Please try again.');
      setSaving(false);
    }
  }

  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_OPTION_COUNT }, (_, index) => today.getFullYear() + index),
    [today],
  );
  const dayOptions = useMemo(
    () => getDayOptions(goalDateParts.month, goalDateParts.year),
    [goalDateParts.month, goalDateParts.year],
  );

  return (
    <AppModal visible={visible} title="Create Goal" onClose={handleClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepLabel}>{wizardLabel}</Text>

        {wizardIndex === 0 ? (
          <AppCard style={styles.card}>
            <Text style={styles.cardTitle}>Build a SMART goal before you plan it.</Text>
            <Text style={styles.cardBody}>
              Specific, measurable, achievable, relevant, and time-bound goals make the next step
              clear.
            </Text>
          </AppCard>
        ) : null}

        {wizardIndex === 1 ? (
          <View style={styles.section}>
            <FormField
              label="Goal name"
              accessibilityLabel="Goal name"
              value={title}
              onChangeText={setTitle}
              placeholder="Run my first 10k"
              placeholderTextColor={colors.textSecondary}
            />

            <FormField
              label="Description"
              accessibilityLabel="Goal description"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Why this goal matters"
              placeholderTextColor={colors.textSecondary}
            />

            <AppCard style={styles.exampleCard}>
              <Text style={styles.exampleLabel}>Simple SMART example</Text>
              <Text style={styles.exampleText}>
                Good goal: Walk 30 minutes after work, 4 days a week, for the next 6 weeks.
              </Text>
            </AppCard>
          </View>
        ) : null}

        {wizardIndex === 3 ? (
          !isPremiumStatusResolved ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>Checking premium access...</Text>
              <Text style={styles.cardBody}>
                Bearing is confirming whether AI goal planning should be unlocked for this account.
              </Text>
            </AppCard>
          ) : hasPremiumAccess ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>Premium AI planning slot is ready.</Text>
              <Text style={styles.cardBody}>
                Your premium gate is clear. The AI milestone and step generator will plug into this
                step in M8.2, and manual planning stays available in the meantime.
              </Text>
              <View style={styles.enabledBadge}>
                <Text style={styles.enabledBadgeText}>Premium Enabled</Text>
              </View>
            </AppCard>
          ) : (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>Unlock AI goal builder with Premium.</Text>
              <Text style={styles.cardBody}>
                Bearing Premium will open AI-generated milestones and steps here once the service
                integration ships. You can keep building the goal manually right now.
              </Text>
              <View style={styles.disabledBadge}>
                <Text style={styles.disabledBadgeText}>Premium Required</Text>
              </View>
              <AppButton
                label="View Premium Plans"
                accessibilityLabel="View premium plans for AI goal builder"
                onPress={onOpenPremiumPaywall}
              />
            </AppCard>
          )
        ) : null}

        {wizardIndex === 2 ? (
          <GoalDatePicker
            title="Estimated completion date"
            summaryLabel={`Selected date: ${formatGoalDateParts(goalDateParts)}`}
            helperText="Format: MM-DD-YYYY"
            accessibilityPrefix="goal target"
            dateParts={goalDateParts}
            activeField={activeGoalDateField}
            optionsByField={{
              month: MONTH_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              day: dayOptions.map((day) => ({ value: day, label: formatTwoDigits(day) })),
              year: yearOptions.map((year) => ({ value: year, label: String(year) })),
            }}
            onToggleField={(field) =>
              setActiveGoalDateField((current) => (current === field ? null : field))
            }
            onSelectField={updateGoalDateField}
          />
        ) : null}

        {wizardIndex === 4 ? (
          <View style={styles.section}>
            {draftSteps.map((step, index) => (
              <AppCard key={step.id} style={styles.card}>
                <Text style={styles.cardTitle}>Step {index + 1}</Text>

                <FormField
                  label="Step name"
                  accessibilityLabel={`Draft step ${index + 1} name`}
                  value={step.title}
                  onChangeText={(value) => updateDraftStep(step.id, 'title', value)}
                  placeholder="Add the next action"
                  placeholderTextColor={colors.textSecondary}
                />

                <FormField
                  label="Description"
                  accessibilityLabel={`Draft step ${index + 1} description`}
                  value={step.description}
                  onChangeText={(value) => updateDraftStep(step.id, 'description', value)}
                  multiline
                  placeholder="Optional details"
                  placeholderTextColor={colors.textSecondary}
                />

                <FormField
                  label="Starter"
                  accessibilityLabel={`Draft step ${index + 1} starter`}
                  value={step.starter}
                  onChangeText={(value) => updateDraftStep(step.id, 'starter', value)}
                  placeholder="Optional starter cue"
                  placeholderTextColor={colors.textSecondary}
                />

                <GoalDatePicker
                  title="Estimated finish date"
                  summaryLabel={`Selected date: ${formatGoalDateParts(step.dateParts)}`}
                  helperText="Format: MM-DD-YYYY"
                  accessibilityPrefix={`draft step ${index + 1}`}
                  dateParts={step.dateParts}
                  activeField={step.activeDateField}
                  optionsByField={{
                    month: MONTH_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                    day: getDayOptions(step.dateParts.month, step.dateParts.year).map((day) => ({
                      value: day,
                      label: formatTwoDigits(day),
                    })),
                    year: yearOptions.map((year) => ({ value: year, label: String(year) })),
                  }}
                  onToggleField={(field) => toggleDraftStepDateField(step.id, field)}
                  onSelectField={(field, value) => updateDraftStepDateField(step.id, field, value)}
                />
              </AppCard>
            ))}

            <AppButton
              label="Add Another Step"
              variant="secondary"
              accessibilityLabel="Add another draft step"
              onPress={() =>
                setDraftSteps((current) => [
                  ...current,
                  makeEmptyDraftStep(current.length + 1, today),
                ])
              }
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actionRow}>
          {canGoBack ? (
            <AppButton
              label="Back"
              variant="secondary"
              accessibilityLabel="Back"
              onPress={() => setWizardIndex((current) => Math.max(0, current - 1))}
              style={styles.actionButton}
            />
          ) : null}

          {wizardIndex < WIZARD_TITLES.length - 1 ? (
            <AppButton
              label="Continue"
              accessibilityLabel="Continue"
              onPress={handleNext}
              style={styles.actionButton}
            />
          ) : (
            <AppButton
              label="Save Goal"
              accessibilityLabel="Save goal"
              onPress={handleSave}
              loading={saving}
              loadingLabel="Saving..."
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.lg,
  },
  stepLabel: {
    ...typography.label,
    color: colors.brand,
  },
  card: {
    gap: spacing.md,
  },
  exampleCard: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  cardTitle: {
    ...typography.button,
    color: colors.text,
  },
  cardBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  exampleLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  exampleText: {
    ...typography.helper,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  disabledBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabledBadgeText: {
    ...typography.helper,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  enabledBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceBrand,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  enabledBadgeText: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  dateFieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateFieldButton: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  dateFieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  dateFieldValue: {
    ...typography.body,
    color: colors.text,
  },
  dateSummary: {
    ...typography.body,
    color: colors.text,
  },
  dateHint: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  dropdownCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dropdownTitle: {
    ...typography.helper,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  dropdownList: {
    maxHeight: 176,
  },
  dropdownOption: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownOptionText: {
    ...typography.body,
    color: colors.textPrimary,
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
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
