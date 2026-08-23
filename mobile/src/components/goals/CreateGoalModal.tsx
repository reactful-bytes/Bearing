import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';

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
import {
  AiGoalMilestone,
  AiCreditStatus,
  AiGoalPlanDraft,
  AiGoalPlanInput,
} from '../../features/goals/aiGoalPlanTypes';
import { CreateGoalInput, CreateGoalStepInput } from '../../features/goals/goalTypes';
import { getAiPlanningErrorCode } from '../../services/firebase/firebaseAiGoalPlans';

type CreateGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalInput) => Promise<void>;
  hasPremiumAccess: boolean;
  isPremiumStatusResolved: boolean;
  onOpenPremiumPaywall: () => void;
  onGenerateAiPlan: (input: AiGoalPlanInput) => Promise<AiGoalPlanDraft>;
  onLoadAiCreditStatus: () => Promise<AiCreditStatus>;
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

function parseAiDateParts(value: string, fallback: GoalDateParts): GoalDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return fallback;
  }

  const dateParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  return Number.isNaN(getGoalDateFromParts(dateParts).getTime()) ? fallback : dateParts;
}

function formatAiTargetDate(dateParts: GoalDateParts): string {
  return `${dateParts.year}-${formatTwoDigits(dateParts.month)}-${formatTwoDigits(dateParts.day)}`;
}

export function CreateGoalModal({
  visible,
  onClose,
  onSave,
  hasPremiumAccess,
  isPremiumStatusResolved,
  onOpenPremiumPaywall,
  onGenerateAiPlan,
  onLoadAiCreditStatus,
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
  const [aiDraft, setAiDraft] = useState<AiGoalPlanDraft | null>(null);
  const [aiMilestones, setAiMilestones] = useState<AiGoalMilestone[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [regenerationConfirmationVisible, setRegenerationConfirmationVisible] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCreditStatus, setAiCreditStatus] = useState<AiCreditStatus | null>(null);
  const [aiCreditsLoading, setAiCreditsLoading] = useState(false);
  const [aiCreditStatusError, setAiCreditStatusError] = useState<string | null>(null);
  const aiRequestId = useRef<string | null>(null);

  const canGoBack = wizardIndex > 0;
  const wizardLabel = useMemo(
    () => `Step ${wizardIndex + 1} of ${WIZARD_TITLES.length}: ${WIZARD_TITLES[wizardIndex]}`,
    [wizardIndex],
  );

  useEffect(() => {
    if (!visible || wizardIndex !== 3 || !isPremiumStatusResolved || !hasPremiumAccess) {
      return;
    }

    let active = true;
    setAiCreditsLoading(true);
    setAiCreditStatusError(null);
    void onLoadAiCreditStatus()
      .then((status) => {
        if (active) setAiCreditStatus(status);
      })
      .catch(() => {
        if (active) setAiCreditStatusError('AI credit balance is unavailable right now.');
      })
      .finally(() => {
        if (active) setAiCreditsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasPremiumAccess, isPremiumStatusResolved, onLoadAiCreditStatus, visible, wizardIndex]);

  function resetForm(): void {
    setWizardIndex(0);
    setTitle('');
    setDescription('');
    setGoalDateParts(buildDefaultGoalDateParts(today));
    setActiveGoalDateField(null);
    setDraftSteps([makeEmptyDraftStep(1, today)]);
    setSaving(false);
    setError(null);
    setAiDraft(null);
    setAiMilestones([]);
    setAiGenerating(false);
    setRegenerationConfirmationVisible(false);
    setAiError(null);
    setAiCreditStatus(null);
    setAiCreditsLoading(false);
    setAiCreditStatusError(null);
    aiRequestId.current = null;
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

  function updateAiMilestone(index: number, field: keyof AiGoalMilestone, value: string): void {
    setAiMilestones((current) =>
      current.map((milestone, milestoneIndex) =>
        milestoneIndex === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  }

  async function handleGenerateAiPlan(): Promise<void> {
    setRegenerationConfirmationVisible(false);
    setAiGenerating(true);
    setAiError(null);

    try {
      aiRequestId.current ??= randomUUID();
      const draft = await onGenerateAiPlan({
        title: title.trim(),
        description: description.trim(),
        targetDate: formatAiTargetDate(goalDateParts),
        requestId: aiRequestId.current,
      });

      aiRequestId.current = null;
      if (typeof draft.availableCredits === 'number') {
        setAiCreditStatus((current) =>
          current ? { ...current, availableCredits: draft.availableCredits! } : current,
        );
      }

      setAiDraft(draft);
      setAiMilestones(draft.milestones);
      setDraftSteps(
        draft.steps.map((step, index) => {
          const dateParts = parseAiDateParts(step.targetDate, goalDateParts);
          return {
            id: `ai-draft-step-${index + 1}`,
            title: step.title,
            description: step.description,
            starter: step.starter,
            estimatedFinishDate: getGoalDateFromParts(dateParts),
            dateParts,
            activeDateField: null,
          };
        }),
      );
    } catch (generationError) {
      const code = getAiPlanningErrorCode(generationError);
      if (code === 'resource-exhausted') {
        aiRequestId.current = null;
        setAiError('No AI planning credits remain. Continue manually or wait for your next grant.');
      } else if (code === 'aborted') {
        setAiError('AI planning is already in progress. Try again shortly.');
      } else if (code === 'invalid-argument') {
        aiRequestId.current = null;
        setAiError('AI planning could not reuse this request. Try again.');
      } else {
        if (code === 'internal') aiRequestId.current = null;
        setAiError('AI planning is unavailable right now. Try again or continue manually.');
      }

      try {
        setAiCreditStatus(await onLoadAiCreditStatus());
      } catch {
        setAiCreditStatusError('AI credit balance is unavailable right now.');
      }
    } finally {
      setAiGenerating(false);
    }
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
        setError('Goal outcome is required.');
        return false;
      }
      if (!description.trim()) {
        setError('Planning context is required for milestones and steps.');
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

      const goalTargetDate = getGoalDateFromParts(goalDateParts);
      const afterGoalIndex = filledSteps.findIndex(
        (step) =>
          step.estimatedFinishDate !== null &&
          step.estimatedFinishDate.getTime() > goalTargetDate.getTime(),
      );
      if (afterGoalIndex !== -1) {
        setError(`Step ${afterGoalIndex + 1} must finish on or before the goal target date.`);
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
        smartMeta: aiDraft?.smartMeta ?? {
          specific: '',
          measurable: '',
          achievable: '',
          relevant: '',
          timeBound: '',
        },
        estimatedCompletionDate: parsedDate,
        isAiAssisted: aiDraft !== null,
        aiPlanVersion: aiDraft?.promptVersion ?? null,
        aiMilestones: aiMilestones
          .filter((milestone) => milestone.title.trim())
          .map((milestone) => ({
            title: milestone.title.trim(),
            description: milestone.description.trim(),
          })),
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
    <>
      <AppModal visible={visible} title="Create Goal" onClose={handleClose} fullScreen>
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
                label="Goal outcome"
                accessibilityLabel="Goal outcome"
                value={title}
                onChangeText={setTitle}
                placeholder="Complete my first 10k"
                placeholderTextColor={colors.textSecondary}
              />

              <FormField
                label="Planning context"
                accessibilityLabel="Planning context"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="List 2-4 objectives, success measures, your starting point, constraints, and timing for each outcome."
                placeholderTextColor={colors.textSecondary}
              />

              <AppCard style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>Planning details to include</Text>
                <Text style={styles.exampleText}>Objectives: 2-4 concrete results you want.</Text>
                <Text style={styles.exampleText}>
                  Success measures: how you will track progress.
                </Text>
                <Text style={styles.exampleText}>Starting point: what is already in place.</Text>
                <Text style={styles.exampleText}>
                  Resources: time, tools, or support available.
                </Text>
                <Text style={styles.exampleText}>
                  Constraints: limits or challenges to plan around.
                </Text>
                <Text style={styles.exampleText}>
                  Timing: intermediate deadlines and the pace for each outcome.
                </Text>
              </AppCard>
            </View>
          ) : null}

          {wizardIndex === 3 ? (
            !isPremiumStatusResolved ? (
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>Checking premium access...</Text>
                <Text style={styles.cardBody}>
                  Bearing is confirming whether AI goal planning should be unlocked for this
                  account.
                </Text>
              </AppCard>
            ) : hasPremiumAccess ? (
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>
                  {aiDraft ? 'Review your AI draft.' : 'Build an editable first draft.'}
                </Text>
                {aiDraft ? (
                  <>
                    <Text style={styles.cardBody}>{aiDraft.timelineSummary}</Text>
                    {aiMilestones.map((milestone, index) => (
                      <View key={`ai-milestone-${index + 1}`} style={styles.milestoneFields}>
                        <Text style={styles.exampleLabel}>Milestone {index + 1}</Text>
                        <FormField
                          label="Milestone name"
                          accessibilityLabel={`AI milestone ${index + 1} name`}
                          value={milestone.title}
                          onChangeText={(value) => updateAiMilestone(index, 'title', value)}
                        />
                        <FormField
                          label="Description"
                          accessibilityLabel={`AI milestone ${index + 1} description`}
                          value={milestone.description}
                          onChangeText={(value) => updateAiMilestone(index, 'description', value)}
                          multiline
                        />
                      </View>
                    ))}
                    <Text style={styles.cardBody}>
                      Continue to review and edit every generated step before saving.
                    </Text>
                    <Text style={styles.regenerationGuidance}>
                      Need a different plan? Go back and clarify the goal outcome, objectives,
                      constraints, or timing before using another AI credit.
                    </Text>
                    <AppButton
                      label="Edit Goal Details"
                      variant="secondary"
                      accessibilityLabel="Edit goal details before regenerating"
                      onPress={() => setWizardIndex(1)}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.exampleLabel}>What the AI plans from</Text>
                    <Text style={styles.cardBody}>
                      Your goal outcome, objectives, success measures, starting point, resources,
                      constraints, and timing guide the generated milestones and ordered steps.
                      Nothing is saved until you review the draft and save the goal.
                    </Text>
                  </>
                )}
                <View style={styles.enabledBadge}>
                  <Text style={styles.enabledBadgeText}>Premium Enabled</Text>
                </View>
                {aiCreditsLoading ? (
                  <Text style={styles.cardBody}>Checking AI credits...</Text>
                ) : null}
                {aiCreditStatus ? (
                  <Text style={styles.cardBody}>
                    AI credits available: {aiCreditStatus.availableCredits}
                    {aiCreditStatus.nextGrantAt
                      ? ` | Next grant ${new Date(aiCreditStatus.nextGrantAt).toLocaleDateString(
                          undefined,
                          { timeZone: 'UTC' },
                        )}`
                      : ''}
                  </Text>
                ) : null}
                {aiCreditStatus?.availableCredits === 0 && !aiError ? (
                  <Text style={styles.errorText}>
                    No AI credits remain. Continue manually or wait for your next grant.
                  </Text>
                ) : null}
                {aiCreditStatusError ? (
                  <Text style={styles.errorText}>{aiCreditStatusError}</Text>
                ) : null}
                {aiError ? <Text style={styles.errorText}>{aiError}</Text> : null}
                {aiGenerating ? (
                  <View
                    style={styles.generationStatus}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel="Generating AI goal plan"
                  >
                    <ActivityIndicator color={colors.brand} />
                    <View style={styles.generationStatusCopy}>
                      <Text style={styles.generationStatusTitle}>Creating your draft...</Text>
                      <Text style={styles.generationStatusText}>
                        Building milestones and steps usually takes a few seconds.
                      </Text>
                    </View>
                  </View>
                ) : null}
                <AppButton
                  label={aiDraft ? 'Regenerate Draft' : 'Generate Draft'}
                  accessibilityLabel={aiDraft ? 'Regenerate AI goal plan' : 'Generate AI goal plan'}
                  onPress={() => {
                    if (aiDraft) {
                      setRegenerationConfirmationVisible(true);
                      return;
                    }
                    void handleGenerateAiPlan();
                  }}
                  loading={aiGenerating}
                  loadingLabel="Generating..."
                  disabled={
                    aiCreditsLoading ||
                    aiCreditStatus?.availableCredits === 0 ||
                    aiCreditStatus?.eligible === false
                  }
                />
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
                month: MONTH_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
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
                    onSelectField={(field, value) =>
                      updateDraftStepDateField(step.id, field, value)
                    }
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
      <AppModal
        visible={regenerationConfirmationVisible}
        title="Regenerate AI Draft?"
        closeLabel="Keep Current Draft"
        onClose={() => setRegenerationConfirmationVisible(false)}
      >
        <View style={styles.confirmationContent}>
          <Text style={styles.cardBody}>
            Regenerating uses 1 AI credit and replaces the current milestones and steps. Review or
            edit your goal details first if the current draft needs clearer direction.
          </Text>
          <AppButton
            label="Use 1 Credit and Regenerate"
            accessibilityLabel="Confirm AI goal plan regeneration"
            onPress={() => void handleGenerateAiPlan()}
            disabled={aiGenerating}
          />
          <AppButton
            label="Edit Goal Details"
            variant="secondary"
            accessibilityLabel="Edit goal details from regeneration confirmation"
            onPress={() => {
              setRegenerationConfirmationVisible(false);
              setWizardIndex(1);
            }}
          />
          <AppButton
            label="Keep Current Draft"
            variant="secondary"
            accessibilityLabel="Cancel AI goal plan regeneration"
            onPress={() => setRegenerationConfirmationVisible(false)}
          />
        </View>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
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
  regenerationGuidance: {
    ...typography.helper,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  generationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  generationStatusCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  generationStatusTitle: {
    ...typography.button,
    color: colors.text,
  },
  generationStatusText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  confirmationContent: {
    gap: spacing.md,
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
  milestoneFields: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
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
