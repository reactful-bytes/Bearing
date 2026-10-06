import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { randomUUID } from 'expo-crypto';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { AppIcon } from '../ui/AppIcon';
import { CreditPackPurchaseModal } from '../premium/CreditPackPurchaseModal';
import { FormField } from '../ui/FormField';
import { RowContextMenu, closeRowContextMenu } from '../ui/RowContextMenu';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ScreenHeader } from '../ui/ScreenHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import {
  GoalDateParts,
  GoalDatePicker,
  buildDefaultGoalDateParts,
  buildGoalDateParts,
  formatTwoDigits,
  getGoalDateFromParts,
  isFutureDate,
  isTodayOrFutureDate,
} from './GoalDatePicker';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  AI_GOAL_PLAN_PROVIDERS,
  AiCreditStatus,
  AiGoalPlanProvider,
  AiGoalPlanDraft,
  AiGoalPlanInput,
  DEFAULT_AI_GOAL_PLAN_PROVIDER,
  shouldShowAiGoalPlanProviderSelector,
} from '../../features/goals/aiGoalPlanTypes';
import {
  CreateGoalInput,
  GoalDraftSaveInput,
  GoalDraftSaveResult,
  GoalTaskInput,
} from '../../features/goals/goalTypes';
import {
  getAiPlanningErrorCode,
  getAiPlanningErrorDetails,
} from '../../services/firebase/firebaseAiGoalPlans';

type CreateGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalInput) => Promise<void>;
  onCreateDraft?: (input: CreateGoalInput) => Promise<string>;
  onSaveDraft?: (goalId: string, input: GoalDraftSaveInput) => Promise<GoalDraftSaveResult>;
  onActivateDraft?: (goalId: string) => Promise<void>;
  hasPremiumAccess: boolean;
  isPremiumStatusResolved: boolean;
  onOpenPremiumPaywall: () => void;
  onGenerateAiPlan: (input: AiGoalPlanInput) => Promise<AiGoalPlanDraft>;
  onLoadAiCreditStatus: () => Promise<AiCreditStatus>;
  creditPackUserId: string | null;
  initialTitle?: string;
  initialDescription?: string;
};

type DraftGoalTask = GoalTaskInput & {
  id: string;
  persistedId?: string;
  dateParts: GoalDateParts;
};

type DraftGoalMilestone = {
  id: string;
  persistedId?: string;
  title: string;
  description: string;
  estimatedFinishDate: Date | null;
  dateParts: GoalDateParts;
  tasks: DraftGoalTask[];
};

type GoalPlanEditorDraft =
  | {
      kind: 'milestone';
      milestoneId: string;
      title: string;
      description: string;
      dateParts: GoalDateParts;
      isNew?: boolean;
    }
  | {
      kind: 'task';
      milestoneId: string;
      taskId: string;
      title: string;
      description: string;
      starter: string;
      dateParts: GoalDateParts;
      isNew?: boolean;
    };
const WIZARD_TITLES = [
  'SMART Setup',
  'Goal Details',
  'Target Date',
  'AI Planning',
  'Milestones & Tasks',
] as const;

const SMART_ITEMS = [
  { letter: 'S', label: 'Specific', description: 'Clear and well-defined', tone: 'brand' },
  { letter: 'M', label: 'Measurable', description: 'Track progress and quantity', tone: 'success' },
  { letter: 'A', label: 'Achievable', description: 'Realistic and attainable', tone: 'warning' },
  { letter: 'R', label: 'Relevant', description: 'Aligned with your values', tone: 'purple' },
  { letter: 'T', label: 'Time-bound', description: 'Has a clear deadline', tone: 'importedCyan' },
] as const;

const TASK_HEADER_INSET = spacing['3xl'] + spacing.xs + spacing.sm;
const TASK_BADGE_SIZE = 20;
const TASK_SECTION_INSET = TASK_HEADER_INSET;
const MILESTONE_BADGE_CENTER = spacing.xs + 16;
const AI_GOAL_PLAN_PROVIDER_OPTIONS = [
  { value: AI_GOAL_PLAN_PROVIDERS.OPENAI, label: 'OpenAI: GPT-6 Luna' },
  { value: AI_GOAL_PLAN_PROVIDERS.GEMINI, label: 'Gemini: 3.6 Flash' },
] as const;

function makeDraftId(prefix: string, index: number, existingIds: string[] = []): string {
  let candidateIndex = index;
  let id = `${prefix}-${candidateIndex}`;
  while (existingIds.includes(id)) {
    candidateIndex += 1;
    id = `${prefix}-${candidateIndex}`;
  }
  return id;
}

function makeEmptyDraftTask(
  index: number,
  baseDate: Date,
  existingIds: string[] = [],
): DraftGoalTask {
  const dateParts = buildDefaultGoalDateParts(baseDate);
  return {
    id: makeDraftId('draft-task', index, existingIds),
    title: '',
    description: '',
    starter: '',
    dueDate: getGoalDateFromParts(dateParts),
    dateParts,
  };
}

function makeEmptyDraftMilestone(
  index: number,
  baseDate: Date,
  existingIds: string[] = [],
): DraftGoalMilestone {
  const dateParts = buildDefaultGoalDateParts(baseDate);
  return {
    id: makeDraftId('draft-milestone', index, existingIds),
    title: '',
    description: '',
    estimatedFinishDate: getGoalDateFromParts(dateParts),
    dateParts,
    tasks: [makeEmptyDraftTask(index, baseDate)],
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

function formatReviewDate(dateParts: GoalDateParts): string {
  return getGoalDateFromParts(dateParts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CreateGoalModal({
  visible,
  onClose,
  onSave,
  onCreateDraft,
  onSaveDraft,
  onActivateDraft,
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
  const [aiGoalPlanProvider, setAiGoalPlanProvider] = useState<AiGoalPlanProvider>(
    DEFAULT_AI_GOAL_PLAN_PROVIDER,
  );
  const canSelectAiGoalPlanProvider = shouldShowAiGoalPlanProviderSelector(
    __DEV__,
    process.env.EXPO_PUBLIC_APP_ENV,
  );
  const [wizardIndex, setWizardIndex] = useState(0);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [persistedGoalId, setPersistedGoalId] = useState<string | null>(null);
  const [goalDateParts, setGoalDateParts] = useState<GoalDateParts>(() =>
    buildDefaultGoalDateParts(today),
  );
  const [draftMilestones, setDraftMilestones] = useState<DraftGoalMilestone[]>([
    makeEmptyDraftMilestone(1, today),
  ]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [editorDraft, setEditorDraft] = useState<GoalPlanEditorDraft | null>(null);
  const [removeConfirmationVisible, setRemoveConfirmationVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<AiGoalPlanDraft | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [regenerationConfirmationVisible, setRegenerationConfirmationVisible] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCreditStatus, setAiCreditStatus] = useState<AiCreditStatus | null>(null);
  const [aiCreditsLoading, setAiCreditsLoading] = useState(false);
  const [aiCreditStatusError, setAiCreditStatusError] = useState<string | null>(null);
  const [creditPackVisible, setCreditPackVisible] = useState(false);
  const aiRequestId = useRef<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveQueue = useRef<Promise<void>>(Promise.resolve());
  const generationAttempt = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialTitle);
    setDescription(initialDescription);
  }, [initialDescription, initialTitle, visible]);

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

  const buildGoalInput = useCallback((): CreateGoalInput => {
    const parsedDate = getGoalDateFromParts(goalDateParts);
    return {
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
      status: 'draft',
      milestones: draftMilestones
        .filter((milestone) => milestone.title.trim())
        .map((milestone) => ({
          title: milestone.title.trim(),
          description: milestone.description.trim(),
          estimatedFinishDate: milestone.estimatedFinishDate,
          tasks: milestone.tasks
            .filter((task) => task.title.trim())
            .map((task) => ({
              title: task.title.trim(),
              description: task.description.trim(),
              starter: task.starter.trim(),
              dueDate: task.dueDate,
            })),
        })),
    };
  }, [aiDraft, description, draftMilestones, goalDateParts, title]);

  const buildDraftSaveInput = useCallback(
    (): GoalDraftSaveInput => ({
      ...buildGoalInput(),
      milestones: draftMilestones
        .filter((milestone) => milestone.title.trim())
        .map((milestone) => ({
          clientId: milestone.id,
          id: milestone.persistedId,
          title: milestone.title.trim(),
          description: milestone.description.trim(),
          estimatedFinishDate: milestone.estimatedFinishDate,
          tasks: milestone.tasks
            .filter((task) => task.title.trim())
            .map((task) => ({
              clientId: task.id,
              id: task.persistedId,
              title: task.title.trim(),
              description: task.description.trim(),
              starter: task.starter.trim(),
              dueDate: task.dueDate,
            })),
        })),
    }),
    [buildGoalInput, draftMilestones],
  );

  const applyDraftSaveResult = useCallback((result: GoalDraftSaveResult): void => {
    const savedMilestones = new Map(
      result.milestones.map((milestone) => [milestone.clientId, milestone]),
    );
    setDraftMilestones((current) => {
      let stateChanged = false;
      const next = current.map((milestone) => {
        const savedMilestone = savedMilestones.get(milestone.id);
        if (!savedMilestone) return milestone;
        const savedTasks = new Map(savedMilestone.tasks.map((task) => [task.clientId, task.id]));
        let tasksChanged = false;
        const tasks = milestone.tasks.map((task) => {
          const persistedId = savedTasks.get(task.id) ?? task.persistedId;
          if (persistedId === task.persistedId) return task;
          tasksChanged = true;
          return { ...task, persistedId };
        });
        if (milestone.persistedId === savedMilestone.id && !tasksChanged) return milestone;
        stateChanged = true;
        return {
          ...milestone,
          persistedId: savedMilestone.id,
          tasks,
        };
      });
      return stateChanged ? next : current;
    });
  }, []);

  useEffect(() => {
    if (!visible || !persistedGoalId || !onSaveDraft || aiGenerating) return;
    autosaveTimer.current = setTimeout(() => {
      const goalId = persistedGoalId;
      const input = buildDraftSaveInput();
      setAutosaveError(null);
      autosaveQueue.current = autosaveQueue.current
        .catch(() => undefined)
        .then(() => onSaveDraft(goalId, input))
        .then(applyDraftSaveResult)
        .catch(() => setAutosaveError('Draft changes could not be saved. Try again.'));
    }, 350);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    };
  }, [
    applyDraftSaveResult,
    buildDraftSaveInput,
    aiGenerating,
    onSaveDraft,
    persistedGoalId,
    visible,
  ]);

  function resetForm(): void {
    setAiGoalPlanProvider(DEFAULT_AI_GOAL_PLAN_PROVIDER);
    setWizardIndex(0);
    setTitle('');
    setDescription('');
    setPersistedGoalId(null);
    setGoalDateParts(buildDefaultGoalDateParts(today));
    setDraftMilestones([makeEmptyDraftMilestone(1, today)]);
    setExpandedRows(new Set());
    closeRowContextMenu();
    setEditorDraft(null);
    setRemoveConfirmationVisible(false);
    setSaving(false);
    setError(null);
    setAutosaveError(null);
    setAiDraft(null);
    setAiGenerating(false);
    setRegenerationConfirmationVisible(false);
    setAiError(null);
    setAiCreditStatus(null);
    setAiCreditsLoading(false);
    setAiCreditStatusError(null);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    aiRequestId.current = null;
  }

  async function handleClose(): Promise<void> {
    generationAttempt.current += 1;
    if (!aiGenerating) {
      try {
        await flushDraftAutosave();
      } catch {
        setAutosaveError('Draft changes could not be saved. Try again before closing.');
        return;
      }
    }
    resetForm();
    onClose();
  }

  function toggleExpandedRow(rowId: string): void {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function closeActionMenus(): void {
    closeRowContextMenu();
  }

  function openMilestoneEditor(milestone: DraftGoalMilestone, isNew = false): void {
    closeActionMenus();
    setEditorDraft({
      kind: 'milestone',
      milestoneId: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dateParts: milestone.dateParts,
      isNew,
    });
  }

  function openTaskEditor(milestone: DraftGoalMilestone, task: DraftGoalTask, isNew = false): void {
    closeActionMenus();
    setEditorDraft({
      kind: 'task',
      milestoneId: milestone.id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      starter: task.starter,
      dateParts: task.dateParts,
      isNew,
    });
  }

  function requestMilestoneDelete(milestone: DraftGoalMilestone): void {
    setEditorDraft({
      kind: 'milestone',
      milestoneId: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dateParts: milestone.dateParts,
    });
    setRemoveConfirmationVisible(true);
  }

  function requestTaskDelete(milestone: DraftGoalMilestone, task: DraftGoalTask): void {
    setEditorDraft({
      kind: 'task',
      milestoneId: milestone.id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      starter: task.starter,
      dateParts: task.dateParts,
    });
    setRemoveConfirmationVisible(true);
  }

  function cancelEditorDraft(): void {
    if (editorDraft?.isNew) {
      if (editorDraft.kind === 'milestone') {
        setDraftMilestones((current) =>
          current.filter((milestone) => milestone.id !== editorDraft.milestoneId),
        );
        setExpandedRows((current) => {
          const next = new Set(current);
          next.delete(`milestone:${editorDraft.milestoneId}`);
          return next;
        });
      } else {
        setDraftMilestones((current) =>
          current.map((milestone) =>
            milestone.id === editorDraft.milestoneId
              ? {
                  ...milestone,
                  tasks: milestone.tasks.filter((task) => task.id !== editorDraft.taskId),
                }
              : milestone,
          ),
        );
      }
    }
    setEditorDraft(null);
  }

  function saveEditorDraft(): void {
    if (!editorDraft) return;
    const date = getGoalDateFromParts(editorDraft.dateParts);
    setDraftMilestones((current) =>
      current.map((milestone) => {
        if (milestone.id !== editorDraft.milestoneId) return milestone;
        if (editorDraft.kind === 'milestone') {
          return {
            ...milestone,
            title: editorDraft.title,
            description: editorDraft.description,
            dateParts: editorDraft.dateParts,
            estimatedFinishDate: date,
          };
        }
        return {
          ...milestone,
          tasks: milestone.tasks.map((task) =>
            task.id === editorDraft.taskId
              ? {
                  ...task,
                  title: editorDraft.title,
                  description: editorDraft.description,
                  starter: editorDraft.starter,
                  dateParts: editorDraft.dateParts,
                  dueDate: date,
                }
              : task,
          ),
        };
      }),
    );
    setEditorDraft(null);
    setError(null);
  }

  function removeEditorDraft(): void {
    if (!editorDraft) return;
    if (editorDraft.kind === 'milestone') {
      setDraftMilestones((current) =>
        current.filter((milestone) => milestone.id !== editorDraft.milestoneId),
      );
      setExpandedRows((current) => {
        const next = new Set(current);
        next.delete(`milestone:${editorDraft.milestoneId}`);
        return next;
      });
    } else {
      setDraftMilestones((current) =>
        current.map((milestone) =>
          milestone.id === editorDraft.milestoneId
            ? {
                ...milestone,
                tasks: milestone.tasks.filter((task) => task.id !== editorDraft.taskId),
              }
            : milestone,
        ),
      );
    }
    setEditorDraft(null);
    setRemoveConfirmationVisible(false);
    setError(null);
  }

  function cancelItemRemoval(): void {
    setRemoveConfirmationVisible(false);
    setEditorDraft(null);
  }

  async function handleGenerateAiPlan(): Promise<void> {
    setRegenerationConfirmationVisible(false);
    if (!title.trim() || title.trim().length > 120) {
      setAiError('Enter a goal name up to 120 characters before generating a plan.');
      return;
    }
    if (!description.trim()) {
      setAiError('Add planning context before generating a plan.');
      return;
    }
    if (!isFutureDate(getGoalDateFromParts(goalDateParts), today)) {
      setAiError('Choose a valid future target date before generating a plan.');
      return;
    }
    const currentGenerationAttempt = ++generationAttempt.current;
    setAiGenerating(true);
    setAiError(null);

    try {
      await flushDraftAutosave();
      if (currentGenerationAttempt !== generationAttempt.current) return;
      aiRequestId.current ??= randomUUID();
      const draft = await onGenerateAiPlan({
        title: title.trim(),
        description: description.trim(),
        targetDate: formatAiTargetDate(goalDateParts),
        goalId: persistedGoalId ?? undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        provider: aiGoalPlanProvider,
        requestId: aiRequestId.current,
      });

      if (currentGenerationAttempt !== generationAttempt.current) return;
      aiRequestId.current = null;
      if (draft.goalId) setPersistedGoalId(draft.goalId);
      if (typeof draft.availableCredits === 'number') {
        setAiCreditStatus((current) =>
          current ? { ...current, availableCredits: draft.availableCredits! } : current,
        );
      }

      setAiDraft(draft);
      setExpandedRows(new Set());
      const responseDate = new Date();
      setDraftMilestones(
        draft.milestones.map((milestone, milestoneIndex) => {
          const milestoneDateParts = parseAiDateParts(
            milestone.targetDate ?? formatAiTargetDate(goalDateParts),
            goalDateParts,
            responseDate,
          );
          return {
            id: milestone.id ?? `ai-draft-milestone-${milestoneIndex + 1}`,
            persistedId: milestone.id,
            title: milestone.title,
            description: milestone.description,
            estimatedFinishDate: getGoalDateFromParts(milestoneDateParts),
            dateParts: milestoneDateParts,
            tasks: milestone.tasks.map((task, taskIndex) => {
              const dateParts = parseAiDateParts(task.targetDate, goalDateParts, responseDate);
              return {
                id: task.id ?? `ai-draft-task-${milestoneIndex + 1}-${taskIndex + 1}`,
                persistedId: task.id,
                title: task.title,
                description: task.description,
                starter: task.starter,
                dueDate: getGoalDateFromParts(dateParts),
                dateParts,
              };
            }),
          };
        }),
      );
    } catch (generationError) {
      if (currentGenerationAttempt !== generationAttempt.current) return;
      const code = getAiPlanningErrorCode(generationError);
      const providerDetails = getAiPlanningErrorDetails(generationError);
      if (code === 'resource-exhausted') {
        aiRequestId.current = null;
        setAiError('No AI planning credits remain. Continue manually or get more AI credits.');
      } else if (code === 'permission-denied') {
        aiRequestId.current = null;
        setAiError(
          'Bearing 360 access is not available for this account yet. Restore purchases or try again shortly.',
        );
      } else if (code === 'aborted') {
        setAiError('An AI plan is already being created. Please wait a moment and try again.');
      } else if (code === 'failed-precondition') {
        aiRequestId.current = null;
        setAiError('That AI planning attempt is no longer available. Please try again.');
      } else if (code === 'invalid-argument') {
        aiRequestId.current = null;
        setAiError(providerDetails ?? 'Check the goal name and target date, then try again.');
      } else {
        if (code === 'internal') aiRequestId.current = null;
        setAiError(
          providerDetails
            ? providerDetails
            : 'AI planning is unavailable right now. Try again or continue manually.',
        );
      }

      try {
        setAiCreditStatus(await onLoadAiCreditStatus());
      } catch {
        setAiCreditStatusError('AI credit balance is unavailable right now.');
      }
    } finally {
      if (currentGenerationAttempt === generationAttempt.current) setAiGenerating(false);
    }
  }

  function updateGoalDate(date: Date): void {
    setGoalDateParts(buildGoalDateParts(date));
    setError(null);
  }

  async function flushDraftAutosave(): Promise<void> {
    if (!persistedGoalId || !onSaveDraft) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    await autosaveQueue.current;
    const result = await onSaveDraft(persistedGoalId, buildDraftSaveInput());
    applyDraftSaveResult(result);
  }

  function validateCurrentStep(): boolean {
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
      const filledMilestones = draftMilestones.filter((milestone) => milestone.title.trim());
      if (filledMilestones.length === 0) {
        setError('Add at least one milestone with a name.');
        return false;
      }
      const goalTargetDate = getGoalDateFromParts(goalDateParts);
      for (const [milestoneIndex, milestone] of filledMilestones.entries()) {
        if (
          !milestone.estimatedFinishDate ||
          !isTodayOrFutureDate(milestone.estimatedFinishDate, currentDate)
        ) {
          setError(`Milestone ${milestoneIndex + 1} target date must be today or later.`);
          return false;
        }
        if (milestone.estimatedFinishDate.getTime() > goalTargetDate.getTime()) {
          setError(
            `Milestone ${milestoneIndex + 1} must finish on or before the goal target date.`,
          );
          return false;
        }
        const tasks = milestone.tasks.filter((task) => task.title.trim());
        for (const [taskIndex, task] of tasks.entries()) {
          if (!task.dueDate || !isTodayOrFutureDate(task.dueDate, currentDate)) {
            setError(
              `Milestone ${milestoneIndex + 1}, task ${taskIndex + 1} due date must be today or later.`,
            );
            return false;
          }
          if (task.dueDate.getTime() > goalTargetDate.getTime()) {
            setError(
              `Milestone ${milestoneIndex + 1}, task ${taskIndex + 1} must be due on or before the goal target date.`,
            );
            return false;
          }
        }
      }
    }

    return true;
  }

  async function handleNext(): Promise<void> {
    if (!validateCurrentStep()) {
      return;
    }

    if (wizardIndex === 2 && !persistedGoalId && onCreateDraft) {
      setSaving(true);
      setError(null);
      try {
        const goalId = await onCreateDraft(buildGoalInput());
        setPersistedGoalId(goalId);
      } catch {
        setError('Failed to save the goal draft. Please try again.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setWizardIndex((current) => Math.min(current + 1, WIZARD_TITLES.length - 1));
  }

  async function handleSave(): Promise<void> {
    if (!validateCurrentStep()) {
      return;
    }

    const goalTitle = title.trim();
    if (!goalTitle) {
      setWizardIndex(1);
      setError('Goal outcome is required.');
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
      const input = { ...buildGoalInput(), title: goalTitle };
      if (persistedGoalId && onActivateDraft) {
        await flushDraftAutosave();
        await onActivateDraft(persistedGoalId);
        resetForm();
        onClose();
        return;
      } else {
        await onSave({ ...input, status: 'active' });
      }
      await handleClose();
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
        onClose={() => void handleClose()}
        fullScreen
        fullScreenEdgeToEdge
        hideHeader
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top,
              paddingBottom: spacing['3xl'] + insets.bottom,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <ScreenHeader
            title="Create Goal"
            onPressBack={handleClose}
            backAccessibilityLabel="Close Create Goal"
          />
          <Text style={[styles.stepLabel, styles.stepLabelCentered]}>{wizardLabel}</Text>
          <View accessibilityLabel={wizardLabel} style={styles.progressDots}>
            {WIZARD_TITLES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressStep,
                  index === WIZARD_TITLES.length - 1 ? styles.progressStepLast : null,
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
                Specific, measurable, achievable, relevant, and time-bound goals make the next step
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
                    <Text style={styles.cardBody}>
                      Continue to review and edit each generated milestone and its tasks before
                      saving.
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
                      constraints, and timing guide the generated milestones and their tasks. Your
                      goal is saved as a draft before planning begins. AI-generated plans are
                      persisted before they return, and edits save automatically.
                    </Text>
                  </>
                )}
                {canSelectAiGoalPlanProvider && !aiGenerating ? (
                  <View style={styles.section}>
                    <Text style={styles.exampleLabel}>AI provider</Text>
                    <SegmentedControl
                      accessibilityLabel="Goal plan AI provider"
                      options={AI_GOAL_PLAN_PROVIDER_OPTIONS}
                      value={aiGoalPlanProvider}
                      onChange={(provider) => {
                        if (provider === aiGoalPlanProvider) return;
                        aiRequestId.current = null;
                        setAiGoalPlanProvider(provider);
                        setAiError(null);
                      }}
                    />
                  </View>
                ) : null}
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
                  disabled={
                    aiGenerating ||
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
            <View style={[styles.section, styles.reviewSection]}>
              <View style={styles.reviewIntro}>
                <Text style={styles.reviewTitle}>Review your plan</Text>
                <Text style={styles.reviewHint}>
                  Open a milestone to review its tasks. Use an item&apos;s actions menu to edit or
                  delete it.
                </Text>
              </View>
              {draftMilestones.map((milestone, index) => {
                const milestoneRowId = `milestone:${milestone.id}`;
                const milestoneMenuId = `goal-wizard:milestone:${milestone.id}`;

                return (
                  <View key={milestone.id} style={styles.milestoneGroup}>
                    <View style={styles.milestoneHeader}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${expandedRows.has(`milestone:${milestone.id}`) ? 'Collapse' : 'Expand'} milestone ${index + 1}: ${milestone.title || `Milestone ${index + 1}`}`}
                        accessibilityHint="Shows or hides the tasks in this milestone"
                        accessibilityState={{
                          expanded: expandedRows.has(`milestone:${milestone.id}`),
                        }}
                        onPress={() => {
                          closeActionMenus();
                          toggleExpandedRow(milestoneRowId);
                        }}
                        style={({ pressed }) => [styles.milestoneRow, pressed && styles.rowPressed]}
                      >
                        <View style={styles.milestoneNumber}>
                          <Text style={styles.milestoneNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.rowCopy}>
                          <Text style={styles.rowEyebrow}>MILESTONE {index + 1}</Text>
                          <Text style={styles.rowTitle} numberOfLines={2}>
                            {milestone.title || 'Untitled milestone'}
                          </Text>
                          <View style={styles.rowMeta}>
                            <AppIcon name="date" size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.rowMetaText}>
                              {formatReviewDate(milestone.dateParts)}
                            </Text>
                            <View style={styles.metaSeparator} />
                            <View style={styles.taskCounter}>
                              <AppIcon
                                name="tasks"
                                size={14}
                                color={theme.colors.textSecondary}
                                decorative
                              />
                              <Text style={styles.taskCounterText}>
                                {milestone.tasks.length}{' '}
                                {milestone.tasks.length === 1 ? 'task' : 'tasks'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <AppIcon
                          name={
                            expandedRows.has(`milestone:${milestone.id}`) ? 'collapse' : 'expand'
                          }
                          size={20}
                          color={theme.colors.textSecondary}
                          decorative
                        />
                      </Pressable>
                      <RowContextMenu
                        menuId={milestoneMenuId}
                        accessibilityLabel={`Open actions for milestone ${index + 1}`}
                        menuAccessibilityLabel="milestone actions menu"
                        items={[
                          {
                            label: 'Edit',
                            accessibilityLabel: `Edit milestone ${milestone.title || index + 1}`,
                            icon: 'edit',
                            onPress: () => openMilestoneEditor(milestone),
                          },
                          {
                            label: 'Delete',
                            accessibilityLabel: `Delete milestone ${milestone.title || index + 1}`,
                            icon: 'delete',
                            tone: 'danger',
                            onPress: () => requestMilestoneDelete(milestone),
                          },
                        ]}
                      />
                    </View>
                    {expandedRows.has(`milestone:${milestone.id}`) ? (
                      <View style={styles.expandedTasks}>
                        {milestone.tasks.length > 0 ? (
                          <View pointerEvents="none" style={styles.taskConnector} />
                        ) : null}
                        <Text accessibilityRole="header" style={styles.taskListHeader}>
                          TASKS
                        </Text>
                        <View style={styles.taskSection}>
                          {milestone.tasks.length === 0 ? (
                            <Text style={styles.emptyTasksText}>
                              No tasks yet. Add one to get started.
                            </Text>
                          ) : null}
                          {milestone.tasks.map((task, taskIndex) => {
                            const taskMenuId = `goal-wizard:task:${milestone.id}:${task.id}`;
                            return (
                              <View key={`${milestone.id}:${task.id}`} style={styles.taskItem}>
                                <View style={styles.taskRow}>
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Open task ${taskIndex + 1} in milestone ${index + 1}: ${task.title || `Task ${taskIndex + 1}`}`}
                                    accessibilityHint="Opens task details, target date, and starter cue"
                                    onPress={() => {
                                      closeActionMenus();
                                      openTaskEditor(milestone, task);
                                    }}
                                    style={({ pressed }) => [
                                      styles.taskRowCopy,
                                      pressed && styles.rowPressed,
                                    ]}
                                  >
                                    <View
                                      pointerEvents="none"
                                      testID={`draft-task-number-${taskIndex + 1}`}
                                      style={styles.taskNumberBadge}
                                    >
                                      <Text style={styles.taskNumberText}>{taskIndex + 1}</Text>
                                    </View>
                                    <View style={styles.rowCopy}>
                                      <Text style={styles.rowTitle} numberOfLines={2}>
                                        {task.title || 'Untitled task'}
                                      </Text>
                                      <View style={styles.rowMeta}>
                                        <AppIcon
                                          name="date"
                                          size={14}
                                          color={theme.colors.textSecondary}
                                          decorative
                                        />
                                        <Text style={styles.taskDate}>
                                          {formatReviewDate(task.dateParts)}
                                        </Text>
                                      </View>
                                    </View>
                                  </Pressable>
                                  <RowContextMenu
                                    menuId={taskMenuId}
                                    accessibilityLabel={`Open actions for task ${taskIndex + 1} in milestone ${index + 1}`}
                                    menuAccessibilityLabel="task actions menu"
                                    items={[
                                      {
                                        label: 'Edit',
                                        accessibilityLabel: `Edit task ${taskIndex + 1} in milestone ${index + 1}`,
                                        icon: 'edit',
                                        onPress: () => openTaskEditor(milestone, task),
                                      },
                                      {
                                        label: 'Delete',
                                        accessibilityLabel: `Delete task ${taskIndex + 1} in milestone ${index + 1}`,
                                        icon: 'delete',
                                        tone: 'danger',
                                        onPress: () => requestTaskDelete(milestone, task),
                                      },
                                    ]}
                                  />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add task to draft milestone ${index + 1}`}
                          onPress={() => {
                            const task = makeEmptyDraftTask(
                              milestone.tasks.length + 1,
                              today,
                              milestone.tasks.map((existingTask) => existingTask.id),
                            );
                            setDraftMilestones((current) =>
                              current.map((candidate) =>
                                candidate.id === milestone.id
                                  ? { ...candidate, tasks: [...candidate.tasks, task] }
                                  : candidate,
                              ),
                            );
                            openTaskEditor(milestone, task, true);
                          }}
                          style={({ pressed }) => [
                            styles.addTaskButton,
                            pressed && styles.rowPressed,
                          ]}
                        >
                          <AppIcon name="add" size={18} color={theme.colors.brand} decorative />
                          <Text style={styles.addTaskText}>Add task</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add another draft milestone"
                style={({ pressed }) => [
                  styles.addTaskButton,
                  styles.addMilestoneButton,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => {
                  const milestone = makeEmptyDraftMilestone(
                    draftMilestones.length + 1,
                    today,
                    draftMilestones.map((existingMilestone) => existingMilestone.id),
                  );
                  setDraftMilestones((current) => [...current, milestone]);
                  setExpandedRows((current) => new Set(current).add(`milestone:${milestone.id}`));
                  openMilestoneEditor(milestone, true);
                }}
              >
                <AppIcon name="add" size={18} color={theme.colors.brand} decorative />
                <Text style={styles.addTaskText}>Add milestone</Text>
              </Pressable>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {autosaveError ? <Text style={styles.errorText}>{autosaveError}</Text> : null}

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
                onPress={() => void handleNext()}
                loading={saving}
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
        visible={editorDraft !== null && !removeConfirmationVisible}
        onClose={cancelEditorDraft}
        fullScreen
        fullScreenEdgeToEdge
        hideHeader
      >
        {editorDraft ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.editorScrollView}
            contentContainerStyle={[
              styles.editorContent,
              {
                paddingTop: insets.top,
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing['2xl'] + insets.bottom,
              },
            ]}
          >
            <ScreenHeader
              title={editorDraft.kind === 'task' ? 'Edit Task' : 'Edit Milestone'}
              onPressBack={cancelEditorDraft}
              backAccessibilityLabel="Cancel plan item editing"
            />
            <FormField
              label={editorDraft.kind === 'task' ? 'Task name' : 'Milestone name'}
              accessibilityLabel={
                editorDraft.kind === 'task' ? 'Edit task name' : 'Edit milestone name'
              }
              value={editorDraft.title}
              onChangeText={(value) =>
                setEditorDraft((current) => (current ? { ...current, title: value } : current))
              }
              placeholder={editorDraft.kind === 'task' ? 'Name this action' : 'Name this milestone'}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <FormField
              label="Description"
              accessibilityLabel={
                editorDraft.kind === 'task' ? 'Edit task description' : 'Edit milestone description'
              }
              value={editorDraft.description}
              onChangeText={(value) =>
                setEditorDraft((current) =>
                  current ? { ...current, description: value } : current,
                )
              }
              multiline
              placeholder="Optional details"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {editorDraft.kind === 'task' ? (
              <FormField
                label="Starter cue"
                accessibilityLabel="Edit task starter cue"
                value={editorDraft.starter}
                onChangeText={(value) =>
                  setEditorDraft((current) =>
                    current?.kind === 'task' ? { ...current, starter: value } : current,
                  )
                }
                placeholder="A useful first action"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : null}
            <GoalDatePicker
              title={editorDraft.kind === 'task' ? 'Task due date' : 'Milestone target date'}
              accessibilityPrefix={editorDraft.kind === 'task' ? 'edit task' : 'edit milestone'}
              dateParts={editorDraft.dateParts}
              onSelectDate={(date) =>
                setEditorDraft((current) =>
                  current ? { ...current, dateParts: buildGoalDateParts(date) } : current,
                )
              }
            />
            <View style={styles.editorActions}>
              <AppButton
                label="Save Changes"
                accessibilityLabel="Save plan item changes"
                onPress={saveEditorDraft}
              />
            </View>
          </ScrollView>
        ) : null}
      </AppModal>
      <ConfirmationModal
        visible={removeConfirmationVisible && editorDraft !== null}
        title={editorDraft?.kind === 'task' ? 'Delete task?' : 'Delete milestone?'}
        message={
          editorDraft?.kind === 'task'
            ? 'This task will be deleted from the goal draft.'
            : 'This milestone and all of its tasks will be deleted from the goal draft.'
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        icon="delete"
        iconTone="danger"
        confirmAccessibilityLabel="Confirm deletion of plan item"
        cancelAccessibilityLabel="Cancel plan item removal"
        onCancel={cancelItemRemoval}
        onConfirm={removeEditorDraft}
      />
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
    stepLabel: {
      ...typography.label,
      color: theme.colors.brand,
    },
    stepLabelCentered: {
      textAlign: 'center',
    },
    progressDots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressStep: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    progressStepLast: {
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
    confirmationDescription: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    confirmationActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    confirmationButton: {
      flex: 1,
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
    milestoneGroup: {
      position: 'relative',
      gap: spacing.xs,
    },
    taskConnector: {
      position: 'absolute',
      left: MILESTONE_BADGE_CENTER,
      top: spacing.xs,
      bottom: spacing['3xl'] + spacing.md + spacing.xs,
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      zIndex: 0,
    },
    taskNumberBadge: {
      position: 'absolute',
      left: TASK_HEADER_INSET - TASK_SECTION_INSET + spacing.sm,
      top: '50%',
      width: TASK_BADGE_SIZE,
      height: TASK_BADGE_SIZE,
      borderRadius: TASK_BADGE_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      transform: [{ translateY: -TASK_BADGE_SIZE / 2 }],
      zIndex: 1,
    },
    taskNumberText: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    milestoneHeader: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    milestoneRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 68,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    rowCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    rowEyebrow: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    rowMetaText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    rowTitle: {
      ...typography.body,
      color: theme.colors.text,
      fontWeight: '700',
    },
    taskCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    taskCounterText: {
      ...typography.caption,
      color: theme.colors.textSecondary,
    },
    metaSeparator: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      marginHorizontal: spacing.xs,
    },
    milestoneNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceBrand,
    },
    milestoneNumberText: {
      ...typography.label,
      color: theme.colors.brand,
      fontWeight: '700',
    },
    taskSection: {
      position: 'relative',
      paddingLeft: TASK_SECTION_INSET,
      paddingRight: 0,
    },
    taskListHeader: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginLeft: TASK_HEADER_INSET,
    },
    expandedTasks: {
      position: 'relative',
      gap: spacing.xs,
      paddingTop: spacing.xs,
    },
    taskRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingRight: 0,
    },
    taskRowCopy: {
      flex: 1,
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingLeft: TASK_BADGE_SIZE + spacing.md + spacing.sm,
      paddingRight: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
    },
    taskItem: {
      position: 'relative',
      marginLeft: -spacing.sm,
    },
    taskDate: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    emptyTasksText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
    },
    addTaskButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
    },
    addMilestoneButton: {
      marginTop: spacing.md,
    },
    addTaskText: {
      ...typography.label,
      color: theme.colors.brand,
      fontWeight: '700',
    },
    reviewIntro: {
      gap: spacing.xs,
    },
    reviewTitle: {
      ...typography.sectionTitle,
      color: theme.colors.text,
    },
    reviewHint: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    reviewSection: { position: 'relative' },
    editorContent: {
      gap: spacing.lg,
      paddingBottom: spacing.md,
    },
    editorScrollView: {
      flex: 1,
    },
    editorActions: {
      gap: spacing.sm,
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
