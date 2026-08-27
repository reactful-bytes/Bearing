import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddStepModal } from '../components/goals/AddStepModal';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
import { StepDetailModal } from '../components/goals/StepDetailModal';
import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { AppCard } from '../components/ui/AppCard';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { colors, layout, radii, spacing, typography } from '../design/tokens';
import {
  CreateGoalInput,
  CreateGoalStepInput,
  GoalStepRecord,
  GoalWithSteps,
} from '../features/goals/goalTypes';
import { PremiumFeature, hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useUserProfile } from '../features/profile/useUserProfile';
import { useGoals } from '../features/goals/useGoals';
import { useGoalStepEvents } from '../features/goals/useGoalStepEvents';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
} from '../services/firebase/firebaseAiGoalPlans';

type GoalFilter = 'active' | 'completed' | 'all';

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getGoalProgressPercent(goal: GoalWithSteps): number {
  if (goal.status === 'completed') {
    return 100;
  }

  if (goal.totalStepCount === 0) {
    return 0;
  }

  return Math.round((goal.completedStepCount / goal.totalStepCount) * 100);
}

export function GoalsScreen() {
  const { createEvent, publicationCalendarTitle } = useCalendarPublication();
  const { authUser, isAnonymous, profile } = useUserProfile();
  const { entitlement, uiState: entitlementUiState } = usePremiumEntitlement(authUser?.uid ?? null);
  const {
    goals,
    uiState,
    createGoal,
    updateGoal,
    markGoalCompleted,
    createStep,
    deleteStep,
    updateStep,
    reorderSteps,
    retry,
  } = useGoals();
  const [createGoalVisible, setCreateGoalVisible] = useState(false);
  const [addStepVisible, setAddStepVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [scheduleStepId, setScheduleStepId] = useState<string | null>(null);
  const [premiumPaywallFeature, setPremiumPaywallFeature] = useState<PremiumFeature | null>(null);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('active');
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status);

  const activeGoalCount = useMemo(
    () => goals.filter((goal) => goal.status === 'active').length,
    [goals],
  );
  const completedGoalCount = goals.length - activeGoalCount;
  const goalFilterOptions = useMemo(
    () => [
      { value: 'active' as const, label: 'Active', count: activeGoalCount },
      { value: 'completed' as const, label: 'Completed', count: completedGoalCount },
      { value: 'all' as const, label: 'All', count: goals.length },
    ],
    [activeGoalCount, completedGoalCount, goals.length],
  );
  const visibleGoals = useMemo(() => {
    if (goalFilter === 'all') {
      return goals;
    }

    return goals.filter((goal) => goal.status === goalFilter);
  }, [goalFilter, goals]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );
  const selectedStep = useMemo(() => {
    if (!selectedStepId) {
      return null;
    }

    const foundGoal = goals.find((goal) => goal.steps.some((step) => step.id === selectedStepId));
    return foundGoal?.steps.find((step) => step.id === selectedStepId) ?? null;
  }, [goals, selectedStepId]);
  const scheduleStep = useMemo(() => {
    if (!scheduleStepId) {
      return null;
    }

    const foundGoal = goals.find((goal) => goal.steps.some((step) => step.id === scheduleStepId));
    return foundGoal?.steps.find((step) => step.id === scheduleStepId) ?? null;
  }, [goals, scheduleStepId]);
  const scheduleGoal = useMemo(() => {
    if (!scheduleStepId) {
      return null;
    }

    return goals.find((goal) => goal.steps.some((step) => step.id === scheduleStepId)) ?? null;
  }, [goals, scheduleStepId]);
  const { events: linkedEvents, uiState: linkedEventsState } = useGoalStepEvents(
    selectedStep?.id ?? null,
  );

  async function handleCreateGoal(input: CreateGoalInput): Promise<void> {
    await createGoal(input);
    setCreateGoalVisible(false);
  }

  async function handleCreateStep(input: CreateGoalStepInput): Promise<void> {
    if (!selectedGoal) {
      throw new Error('Goal not found.');
    }

    await createStep(selectedGoal.id, input);
  }

  async function handleDeleteStep(step: GoalStepRecord): Promise<void> {
    await deleteStep(step.id);
    setSelectedStepId(null);
  }

  async function handleSaveGoal(
    goalId: string,
    fields: { title: string; description: string; estimatedCompletionDate: Date },
  ): Promise<void> {
    await updateGoal(goalId, fields);
  }

  async function handleSaveStep(
    stepId: string,
    fields: {
      title: string;
      description: string;
      starter: string;
      estimatedFinishDate: Date | null;
    },
  ): Promise<void> {
    await updateStep(stepId, fields);
  }

  async function handleToggleStepStatus(step: GoalStepRecord): Promise<void> {
    await updateStep(step.id, {
      status: step.status === 'completed' ? 'pending' : 'completed',
    });
  }

  async function handleScheduleStepEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    await createEvent(input, options);
    setScheduleStepId(null);
  }

  function openGoal(goal: GoalWithSteps): void {
    setSelectedGoalId(goal.id);
  }

  function closeGoalDetails(): void {
    setSelectedGoalId(null);
    setSelectedStepId(null);
    setAddStepVisible(false);
  }

  function closePremiumPaywall(): void {
    setPremiumPaywallFeature(null);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ScreenHeader
          eyebrow="Goals"
          title="Goals"
          description="Break long-term goals into ordered steps, then schedule the next move into your calendar."
        />

        <SegmentedControl
          accessibilityLabel="Goal filter"
          options={goalFilterOptions}
          value={goalFilter}
          onChange={setGoalFilter}
        />

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading goals...</Text>
            <Text style={styles.stateDescription}>
              Pulling in your current goals and step order.
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <RecoveryCard
            title="Unable to load goals."
            description="Check your connection, then retry."
            onRetry={retry}
          />
        ) : null}

        {(uiState === 'empty' || uiState === 'ready') && visibleGoals.length === 0 ? (
          <AppCard>
            <Text style={styles.stateTitle}>
              {goalFilter === 'active'
                ? 'No active goals.'
                : goalFilter === 'completed'
                  ? 'No completed goals.'
                  : 'No goals yet.'}
            </Text>
            <Text style={styles.stateDescription}>
              {goalFilter === 'active'
                ? 'Create a goal to start building a step-by-step plan.'
                : goalFilter === 'completed'
                  ? 'Goals you finish will stay available here.'
                  : 'Create your first goal to start building a step-by-step plan.'}
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'ready' || uiState === 'empty'
          ? visibleGoals.map((goal) => {
              const progressPercent = getGoalProgressPercent(goal);

              return (
                <Pressable
                  key={goal.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open goal ${goal.title}`}
                  onPress={() => openGoal(goal)}
                  style={({ pressed }) => [
                    styles.goalCardPressable,
                    pressed ? styles.goalCardPressed : null,
                  ]}
                >
                  <AppCard style={styles.goalCard}>
                    <View style={styles.goalHeaderRow}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalStatus}>
                        {goal.status === 'completed' ? 'Completed' : 'Active'}
                      </Text>
                    </View>
                    <Text style={styles.goalDate}>
                      Target: {formatDate(goal.estimatedCompletionDate)}
                    </Text>
                    <Text style={styles.goalNextStep}>
                      Next:{' '}
                      {goal.nextStep
                        ? goal.nextStep.title
                        : goal.status === 'completed'
                          ? 'Completed'
                          : 'Add a step'}
                    </Text>
                    <View style={styles.progressCopyRow}>
                      <Text style={styles.goalProgress}>{goal.progressText}</Text>
                      <Text style={styles.goalProgressPercent}>{progressPercent}%</Text>
                    </View>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityLabel={`Goal progress ${goal.title}`}
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: progressPercent,
                        text: goal.progressText,
                      }}
                      style={styles.progressTrack}
                    >
                      <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>
                  </AppCard>
                </Pressable>
              );
            })
          : null}
      </ScrollView>

      <View style={styles.fabContainer}>
        <FloatingActionButton
          label="New Goal"
          onPress={() => setCreateGoalVisible(true)}
          style={styles.smallFab}
        />
      </View>

      <CreateGoalModal
        visible={createGoalVisible}
        onClose={() => setCreateGoalVisible(false)}
        onSave={handleCreateGoal}
        hasPremiumAccess={hasPremiumAccess}
        isPremiumStatusResolved={entitlementUiState === 'ready'}
        onOpenPremiumPaywall={() => setPremiumPaywallFeature('ai_goal_builder')}
        onGenerateAiPlan={generateAiGoalPlanDraft}
        onLoadAiCreditStatus={getAiCreditStatus}
        creditPackUserId={!isAnonymous ? (authUser?.uid ?? null) : null}
      />

      <PremiumPaywallModal
        visible={premiumPaywallFeature !== null}
        feature={premiumPaywallFeature}
        userId={authUser?.uid ?? null}
        isAnonymous={isAnonymous}
        hasPremiumAccess={hasPremiumAccess}
        onClose={closePremiumPaywall}
      />

      <GoalDetailsModal
        goal={selectedGoal}
        visible={selectedGoal !== null && !addStepVisible}
        onClose={closeGoalDetails}
        onSaveGoal={handleSaveGoal}
        onMarkGoalCompleted={markGoalCompleted}
        onAddStep={() => setAddStepVisible(true)}
        onOpenStep={(step) => setSelectedStepId(step.id)}
        onToggleStepStatus={handleToggleStepStatus}
        onReorderSteps={reorderSteps}
      />

      <AddStepModal
        visible={addStepVisible}
        onClose={() => setAddStepVisible(false)}
        onSave={handleCreateStep}
      />

      <StepDetailModal
        goalTitle={selectedGoal?.title ?? scheduleGoal?.title ?? 'Goal'}
        step={selectedStep}
        visible={selectedStep !== null}
        linkedEvents={linkedEvents}
        linkedEventsState={linkedEventsState}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => setSelectedStepId(null)}
        onSaveStep={handleSaveStep}
        onDeleteStep={handleDeleteStep}
        onSchedule={(step) => setScheduleStepId(step.id)}
        onToggleComplete={handleToggleStepStatus}
      />

      <AddEventModal
        visible={scheduleStep !== null}
        modalTitle="Schedule Step Event"
        initialDate={
          scheduleStep?.estimatedFinishDate ?? scheduleGoal?.estimatedCompletionDate ?? new Date()
        }
        initialValues={
          scheduleStep
            ? {
                title: scheduleStep.title,
                description: scheduleStep.description,
                goalId: scheduleGoal?.id ?? null,
                stepId: scheduleStep.id,
              }
            : undefined
        }
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => setScheduleStepId(null)}
        onSave={handleScheduleStepEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: layout.pagePaddingHorizontal,
    paddingVertical: layout.pagePaddingVertical,
    gap: spacing.xl,
    paddingBottom: 120,
  },
  stateTitle: {
    ...typography.button,
    color: colors.text,
  },
  stateDescription: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  goalCardPressable: {
    borderRadius: radii.lg,
  },
  goalCardPressed: {
    opacity: 0.88,
  },
  goalCard: {
    gap: spacing.sm,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalTitle: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
    flex: 1,
  },
  goalStatus: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '700',
  },
  goalDate: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  goalNextStep: {
    ...typography.helper,
    color: colors.textPrimary,
  },
  progressCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  goalProgress: {
    ...typography.helper,
    color: colors.textSecondary,
    flex: 1,
  },
  goalProgressPercent: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  fabContainer: {
    position: 'absolute',
    right: layout.pagePaddingHorizontal,
    bottom: layout.pagePaddingVertical,
  },
  smallFab: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
});
