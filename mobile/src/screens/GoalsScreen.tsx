import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddStepModal } from '../components/goals/AddStepModal';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
import { StepDetailModal } from '../components/goals/StepDetailModal';
import { GoalCard, GoalStatusTabs } from '../components/presentation/GoalPresentation';
import type { GoalFilter } from '../components/presentation/GoalPresentation';
import { AppCard } from '../components/ui/AppCard';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { layout, radii, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import {
  CreateGoalInput,
  CreateGoalStepInput,
  GoalStepRecord,
  GoalWithSteps,
} from '../features/goals/goalTypes';
import { hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useUserProfile } from '../features/profile/useUserProfile';
import { useGoals } from '../features/goals/useGoals';
import { useGoalStepEvents } from '../features/goals/useGoalStepEvents';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { PlanStackParamList, RootStackParamList } from '../navigation/navigationTypes';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
} from '../services/firebase/firebaseAiGoalPlans';

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type GoalsScreenProps = {
  route?: { params?: PlanStackParamList['Goals'] };
  navigation?: {
    setParams?: (params: PlanStackParamList['Goals']) => void;
    navigate?: (
      screen: 'GoalDetail' | 'PremiumPaywall',
      params: PlanStackParamList['GoalDetail'] | RootStackParamList['PremiumPaywall'],
    ) => void;
    getParent?: () =>
      | {
          navigate?: (screen: string, params?: Record<string, unknown>) => void;
        }
      | undefined;
  };
};

export function GoalsScreen({ route, navigation }: GoalsScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
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
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('active');
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status);

  useEffect(() => {
    if (!route?.params?.createGoal) {
      return;
    }

    setCreateGoalVisible(true);
    navigation?.setParams?.({ createGoal: undefined });
  }, [navigation, route?.params?.createGoal]);

  const activeGoalCount = useMemo(
    () => goals.filter((goal) => goal.status === 'active').length,
    [goals],
  );
  const completedGoalCount = goals.filter((goal) => goal.status === 'completed').length;
  const archivedGoalCount = goals.filter((goal) => goal.status === 'archived').length;
  const goalFilterOptions = useMemo(
    () => [
      { value: 'active' as const, label: 'Current', count: activeGoalCount },
      { value: 'completed' as const, label: 'Completed', count: completedGoalCount },
      { value: 'archived' as const, label: 'Archived', count: archivedGoalCount },
    ],
    [activeGoalCount, archivedGoalCount, completedGoalCount],
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
    if (navigation?.navigate) {
      navigation.navigate('GoalDetail', { goalId: goal.id });
      return;
    }

    setSelectedGoalId(goal.id);
  }

  function closeGoalDetails(): void {
    setSelectedGoalId(null);
    setSelectedStepId(null);
    setAddStepVisible(false);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Goals" onPressBack={() => navigation?.getParent?.()?.navigate?.('Plan')} />
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: spacing.xl + insets.bottom },
        ]}
      >
        <GoalStatusTabs
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
                  : goalFilter === 'archived'
                    ? 'No archived goals.'
                    : 'No goals yet.'}
            </Text>
            <Text style={styles.stateDescription}>
              {goalFilter === 'active'
                ? 'Create a goal to start building a step-by-step plan.'
                : goalFilter === 'completed'
                  ? 'Goals you finish will stay available here.'
                  : goalFilter === 'archived'
                    ? 'Archived goals will stay available here for reference.'
                    : 'Create your first goal to start building a step-by-step plan.'}
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'ready' || uiState === 'empty'
          ? visibleGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                formatDate={formatDate}
                onPress={() => openGoal(goal)}
              />
            ))
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
        onOpenPremiumPaywall={() =>
          navigation?.navigate?.('PremiumPaywall', {
            feature: 'ai_goal_builder',
            source: 'ai_goal_builder',
          })
        }
        onGenerateAiPlan={generateAiGoalPlanDraft}
        onLoadAiCreditStatus={getAiCreditStatus}
        creditPackUserId={!isAnonymous ? (authUser?.uid ?? null) : null}
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
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      color: theme.colors.text,
    },
    stateDescription: {
      ...typography.body,
      color: theme.colors.textPrimary,
      marginTop: spacing.sm,
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
