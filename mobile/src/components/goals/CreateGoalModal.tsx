import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { randomUUID } from 'expo-crypto';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { CreditPackPurchaseModal } from '../premium/CreditPackPurchaseModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import {
  GoalDateParts,
  GoalDatePicker,
  buildDefaultGoalDateParts,
  buildGoalDateParts,
  formatTwoDigits,
  getGoalDateFromParts,
  isTodayOrFutureDate,
} from './GoalDatePicker';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  AiGoalMilestone,
  AiCreditStatus,
  AiGoalPlanDraft,
  AiGoalPlanInput,
} from '../../features/goals/aiGoalPlanTypes';
import { CreateGoalInput } from '../../features/goals/goalTypes';
import { CreateTaskInput } from '../../features/tasks/taskTypes';
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
  creditPackUserId: string | null;
  initialTitle?: string;
  initialDescription?: string;
};

type DraftGoalTask = {
  id: string;
  title: string;
  description: string;
  starter: string;
  dueDate: Date | null;
  dateParts: GoalDateParts;
};

const WIZARD_TITLES = [
  'SMART Setup',
  'Goal Details',
  'Target Date',
  'AI Planning',
  'Tasks',
] as const;

const SMART_ITEMS = [
  { letter: 'S', label: 'Specific', description: 'Clear and well-defined', tone: 'brand' },
  { letter: 'M', label: 'Measurable', description: 'Track progress and quantity', tone: 'success' },
  { letter: 'A', label: 'Achievable', description: 'Realistic and attainable', tone: 'warning' },
  { letter: 'R', label: 'Relevant', description: 'Aligned with your values', tone: 'purple' },
  { letter: 'T', label: 'Time-bound', description: 'Has a clear deadline', tone: 'importedCyan' },
] as const;

function makeEmptyDraftTask(index: number, baseDate: Date): DraftGoalTask {
  const defaultDateParts = buildDefaultGoalDateParts(baseDate);

  return {
    id: `draft-task-${index}`,
    title: '',
    description: '',
    starter: '',
    dueDate: getGoalDateFromParts(defaultDateParts),
    dateParts: defaultDateParts,
  };
}

function parseAiDateParts(
  value: string,
  goalTargetDateParts: GoalDateParts,
  currentDate: Date,
): GoalDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return goalTargetDateParts;
  }

  const dateParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const parsedDate = getGoalDateFromParts(dateParts);
  const isValidCalendarDate =
    parsedDate.getFullYear() === dateParts.year &&
    parsedDate.getMonth() + 1 === dateParts.month &&
    parsedDate.getDate() === dateParts.day;

  if (!isValidCalendarDate) {
    return goalTargetDateParts;
  }

  if (!isTodayOrFutureDate(parsedDate, currentDate)) {
    return buildDefaultGoalDateParts(currentDate);
  }

  return parsedDate.getTime() > getGoalDateFromParts(goalTargetDateParts).getTime()
    ? goalTargetDateParts
    : dateParts;
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
  creditPackUserId,
  initialTitle = '',
  initialDescription = '',
}: CreateGoalModalProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [goalDateParts, setGoalDateParts] = useState<GoalDateParts>(() =>
    buildDefaultGoalDateParts(today),
  );
  const [draftTasks, setDraftTasks] = useState<DraftGoalTask[]>([makeEmptyDraftTask(1, today)]);
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
  const [creditPackVisible, setCreditPackVisible] = useState(false);
  const aiRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialTitle);
    setDescription(initialDescription);
  }, [initialDescription, initialTitle, visible]);

  const canGoBack = wizardIndex > 0;
  const wizardLabel = useMemo(
    () => `Stage ${wizardIndex + 1} of ${WIZARD_TITLES.length}: ${WIZARD_TITLES[wizardIndex]}`,
    [wizardIndex],
  );

  useEffect(() => {
    if (!visible || wizardIndex !== 3 || !isPremiumStatusResolved || !hasPremiumAccess) {
      return;
    }

    let active = true;
    setAiCreditsLoading(true);
    setAiCreditStatusError(null);
    setCreditPackVisible(false);
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
    setDraftTasks([makeEmptyDraftTask(1, today)]);
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

  function updateDraftTask(id: string, field: keyof DraftGoalTask, value: string): void {
    setDraftTasks((current) =>
      current.map((task) => {
        if (task.id !== id) {
          return task;
        }

        return { ...task, [field]: value };
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
      const responseDate = new Date();
      setDraftTasks(
        draft.tasks.map((task, index) => {
          const dateParts = parseAiDateParts(task.targetDate, goalDateParts, responseDate);
          return {
            id: `ai-draft-task-${index + 1}`,
            title: task.title,
            description: task.description,
            starter: task.starter,
            dueDate: getGoalDateFromParts(dateParts),
            dateParts,
          };
        }),
      );
    } catch (generationError) {
      const code = getAiPlanningErrorCode(generationError);
      if (code === 'resource-exhausted') {
        aiRequestId.current = null;
        setAiError('No AI planning credits remain. Continue manually or get more AI credits.');
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

  function updateDraftTaskDate(id: string, date: Date): void {
    setDraftTasks((current) =>
      current.map((task) => {
        if (task.id !== id) {
          return task;
        }

        const nextDateParts = buildGoalDateParts(date);

        return {
          ...task,
          dateParts: nextDateParts,
          dueDate: getGoalDateFromParts(nextDateParts),
        };
      }),
    );
    setError(null);
  }

  function updateGoalDate(date: Date): void {
    setGoalDateParts(buildGoalDateParts(date));
    setError(null);
  }

  function validateCurrentStage(): boolean {
    setError(null);
    const currentDate = new Date();

    if (wizardIndex === 1) {
      if (!title.trim()) {
        setError('Goal outcome is required.');
        return false;
      }
      if (!description.trim()) {
        setError('Planning context is required for milestones and tasks.');
        return false;
      }
    }

    if (wizardIndex === 2) {
      const selectedDate = getGoalDateFromParts(goalDateParts);
      if (!isTodayOrFutureDate(selectedDate, currentDate)) {
        setError('Estimated completion date must be today or later.');
        return false;
      }
    }

    if (wizardIndex === 4) {
      const filledTasks = draftTasks.filter((task) => task.title.trim());
      if (filledTasks.length === 0) {
        setError('Add at least one task with a name.');
        return false;
      }

      const invalidTaskIndex = filledTasks.findIndex(
        (task) => !task.dueDate || !isTodayOrFutureDate(task.dueDate, currentDate),
      );

      if (invalidTaskIndex !== -1) {
        setError(`Task ${invalidTaskIndex + 1} due date must be today or later.`);
        return false;
      }

      const goalTargetDate = getGoalDateFromParts(goalDateParts);
      const afterGoalIndex = filledTasks.findIndex((task) => {
        const dueDate = task.dueDate;
        return dueDate !== null && dueDate.getTime() > goalTargetDate.getTime();
      });
      if (afterGoalIndex !== -1) {
        setError(`Task ${afterGoalIndex + 1} must be due on or before the goal target date.`);
        return false;
      }
    }

    return true;
  }

  function handleNext(): void {
    if (!validateCurrentStage()) {
      return;
    }

    setWizardIndex((current) => Math.min(current + 1, WIZARD_TITLES.length - 1));
  }

  async function handleSave(): Promise<void> {
    if (!validateCurrentStage()) {
      return;
    }

    const parsedDate = getGoalDateFromParts(goalDateParts);
    if (!isTodayOrFutureDate(parsedDate, today)) {
      setError('Estimated completion date must be today or later.');
      return;
    }

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
        tasks: draftTasks
          .filter((task) => task.title.trim())
          .map((task, index) => ({
            title: task.title.trim(),
            description: task.description.trim(),
            starter: task.starter.trim(),
            dueDate: task.dueDate,
            order: index,
          })),
      });
      handleClose();
    } catch {
      setError('Failed to save goal. Please try again.');
      setSaving(false);
    }
  }

  return (
    <>
      <AppModal
        visible={visible && !creditPackVisible}
        title="Create Goal"
        onClose={handleClose}
        fullScreen
        hideHeader
      >
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
            title="Create Goal"
            onPressBack={handleClose}
            backAccessibilityLabel="Close Create Goal"
          />
          <Text style={[styles.stageLabel, styles.stageLabelCentered]}>{wizardLabel}</Text>
          <View accessibilityLabel={wizardLabel} style={styles.progressDots}>
            {WIZARD_TITLES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressStage,
                  index === WIZARD_TITLES.length - 1 ? styles.progressStageLast : null,
                ]}
              >
                <View
                  style={[
                    styles.progressCircle,
                    index < wizardIndex ? styles.progressCircleComplete : null,
                    index === wizardIndex ? styles.progressCircleActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressCircleText,
                      index < wizardIndex ? styles.progressCircleTextActive : null,
                      index === wizardIndex ? styles.progressCircleTextCurrent : null,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                {index < WIZARD_TITLES.length - 1 ? (
                  <View
                    style={[
                      styles.progressConnector,
                      index < wizardIndex ? styles.progressConnectorComplete : null,
                    ]}
                  />
                ) : null}
              </View>
            ))}
          </View>

          {wizardIndex === 0 ? (
            <AppCard style={styles.card}>
              <Text style={styles.smartIntroTitle}>Let&apos;s create a SMART goal</Text>
              <Text style={styles.cardBody}>
                Specific, measurable, achievable, relevant, and time-bound goals make the next task
                clear.
              </Text>
              <View style={styles.smartList}>
                {SMART_ITEMS.map((item) => (
                  <View key={item.letter} style={styles.smartRow}>
                    <View style={[styles.smartBadge, { backgroundColor: theme.colors[item.tone] }]}>
                      <Text style={styles.smartBadgeText}>{item.letter}</Text>
                    </View>
                    <View style={styles.smartCopy}>
                      <Text style={styles.smartLabel}>{item.label}</Text>
                      <Text style={styles.smartDescription}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </AppCard>
          ) : null}

          {wizardIndex === 1 ? (
            <View style={styles.section}>
              <FormField
                label="Goal outcome"
                accessibilityLabel="Goal outcome"
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Complete my first 10k by next month."
                placeholderTextColor={theme.colors.textSecondary}
              />

              <FormField
                label="Planning context"
                accessibilityLabel="Planning context"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Starting Point, success measures, any sub-goals, any constraints, and timing for each outcome."
                placeholderTextColor={theme.colors.textSecondary}
              />

              <AppCard style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>Planning details to include</Text>
                <Text style={styles.exampleText}>Starting point: what is already in place.</Text>
                <Text style={styles.exampleText}>
                  Success measures: how you will track progress.
                </Text>
                <Text style={styles.exampleText}>
                  Resources: time, tools, or support available.
                </Text>
                <Text style={styles.exampleText}>
                  Constraints: limits or challenges to plan around.
                </Text>
                <Text style={styles.exampleText}>
                  Timing: any intermediate deadlines or a pace you want to maintain.
                </Text>
              </AppCard>
            </View>
          ) : null}

          {wizardIndex === 3 ? (
            !isPremiumStatusResolved ? (
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>Checking Bearing 360 access...</Text>
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
                      Continue to review and edit every generated task before saving.
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
                      constraints, and timing guide the generated milestones and ordered tasks.
                      Nothing is saved until you review the draft and save the goal.
                    </Text>
                  </>
                )}
                {aiCreditsLoading ? (
                  <Text style={styles.cardBody}>Checking AI credits...</Text>
                ) : null}
                {aiCreditStatus ? (
                  <Text style={styles.cardBody}>
                    AI credits available: {aiCreditStatus.availableCredits}
                  </Text>
                ) : null}
                {aiCreditStatus?.availableCredits === 0 && !aiError ? (
                  <Text style={styles.errorText}>
                    No AI credits remain. Continue manually or check your plan balance later.
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
                    <ActivityIndicator color={theme.colors.brand} />
                    <View style={styles.generationStatusCopy}>
                      <Text style={styles.generationStatusTitle}>Creating your draft...</Text>
                      <Text style={styles.generationStatusText}>
                        Building milestones and tasks usually takes a few seconds.
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
                {creditPackUserId ? (
                  <AppButton
                    label="Get More AI Credits"
                    variant="secondary"
                    accessibilityLabel="Get more AI credits from AI planning"
                    onPress={() => setCreditPackVisible(true)}
                  />
                ) : null}
              </AppCard>
            ) : (
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>Unlock AI goal builder with Bearing 360.</Text>
                <Text style={styles.cardBody}>
                  Bearing 360 opens AI-generated milestones and tasks here. You can keep building
                  the goal manually right now.
                </Text>
                <View style={styles.disabledBadge}>
                  <Text style={styles.disabledBadgeText}>Bearing 360 Required</Text>
                </View>
                <AppButton
                  label="View Bearing 360 Plans"
                  accessibilityLabel="View Bearing 360 plans for AI goal builder"
                  onPress={onOpenPremiumPaywall}
                />
              </AppCard>
            )
          ) : null}

          {wizardIndex === 2 ? (
            <GoalDatePicker
              title="Estimated completion date"
              accessibilityPrefix="goal target"
              dateParts={goalDateParts}
              onSelectDate={updateGoalDate}
            />
          ) : null}

          {wizardIndex === 4 ? (
            <View style={styles.section}>
              {draftTasks.map((task, index) => (
                <AppCard key={task.id} style={styles.card}>
                  <Text style={styles.cardTitle}>Task {index + 1}</Text>

                  <FormField
                    label="Task name"
                    accessibilityLabel={`Draft task ${index + 1} name`}
                    value={task.title}
                    onChangeText={(value) => updateDraftTask(task.id, 'title', value)}
                    placeholder="Add the next action"
                    placeholderTextColor={theme.colors.textSecondary}
                  />

                  <FormField
                    label="Description"
                    accessibilityLabel={`Draft task ${index + 1} description`}
                    value={task.description}
                    onChangeText={(value) => updateDraftTask(task.id, 'description', value)}
                    multiline
                    placeholder="Optional details"
                    placeholderTextColor={theme.colors.textSecondary}
                  />

                  <FormField
                    label="Starter"
                    accessibilityLabel={`Draft task ${index + 1} starter`}
                    value={task.starter}
                    onChangeText={(value) => updateDraftTask(task.id, 'starter', value)}
                    placeholder="Optional starter cue"
                    placeholderTextColor={theme.colors.textSecondary}
                  />

                  <GoalDatePicker
                    title="Due date"
                    accessibilityPrefix={`draft task ${index + 1}`}
                    dateParts={task.dateParts}
                    onSelectDate={(date) => updateDraftTaskDate(task.id, date)}
                  />
                </AppCard>
              ))}

              <AppButton
                label="Add Another Task"
                variant="secondary"
                accessibilityLabel="Add another draft task"
                onPress={() =>
                  setDraftTasks((current) => [
                    ...current,
                    makeEmptyDraftTask(current.length + 1, today),
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
            Regenerating uses 1 AI credit and replaces the current milestones and tasks. Review or
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
      <CreditPackPurchaseModal
        visible={creditPackVisible}
        userId={creditPackUserId}
        enabled={hasPremiumAccess && creditPackUserId !== null}
        source="ai_planning"
        currentBalance={aiCreditStatus?.availableCredits ?? null}
        onBalanceUpdated={(availableCredits) =>
          setAiCreditStatus({ eligible: true, availableCredits })
        }
        onClose={() => setCreditPackVisible(false)}
      />
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
      paddingBottom: spacing['3xl'],
    },
    section: {
      gap: spacing.lg,
    },
    stageLabel: {
      ...typography.label,
      color: theme.colors.brand,
    },
    stageLabelCentered: {
      textAlign: 'center',
    },
    progressDots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressStage: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    progressStageLast: {
      flex: 0,
    },
    progressCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.surfaceMuted,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    progressCircleActive: {
      borderColor: theme.colors.brand,
      backgroundColor: theme.colors.brand,
    },
    progressCircleComplete: {
      borderColor: theme.colors.brand,
      backgroundColor: theme.colors.surfaceBrand,
    },
    progressCircleText: {
      ...typography.helper,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    progressCircleTextActive: {
      color: theme.colors.brand,
    },
    progressCircleTextCurrent: {
      color: theme.colors.onBrand,
    },
    progressConnector: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.surfaceMuted,
      marginHorizontal: spacing.xs,
    },
    progressConnectorComplete: {
      backgroundColor: theme.colors.brand,
    },
    smartList: {
      gap: spacing.md,
    },
    smartRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    smartBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    smartBadgeText: {
      ...typography.button,
      color: theme.colors.onBrand,
    },
    smartCopy: {
      flex: 1,
      gap: 2,
    },
    smartLabel: {
      ...typography.button,
      color: theme.colors.text,
    },
    smartDescription: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    card: {
      gap: spacing.md,
      padding: spacing.lg,
    },
    exampleCard: {
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },
    cardTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    smartIntroTitle: {
      ...typography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.brand,
    },
    cardBody: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    exampleLabel: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    exampleText: {
      ...typography.helper,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    regenerationGuidance: {
      ...typography.helper,
      color: theme.colors.textSecondary,
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
      color: theme.colors.text,
    },
    generationStatusText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    confirmationContent: {
      gap: spacing.md,
    },
    disabledBadge: {
      alignSelf: 'flex-start',
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    disabledBadgeText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
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
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    dateFieldLabel: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    dateFieldValue: {
      ...typography.body,
      color: theme.colors.text,
    },
    dateSummary: {
      ...typography.body,
      color: theme.colors.text,
    },
    dateHint: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    dropdownCard: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    dropdownTitle: {
      ...typography.helper,
      color: theme.colors.textSecondary,
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
      color: theme.colors.textPrimary,
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
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
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
      backgroundColor: theme.colors.brand,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonText: {
      ...typography.button,
      color: theme.colors.surface,
    },
    secondaryButtonText: {
      ...typography.button,
      color: theme.colors.textPrimary,
    },
    buttonPressed: {
      opacity: 0.86,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
