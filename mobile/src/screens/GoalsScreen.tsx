import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddMilestoneModal } from '../components/goals/AddMilestoneModal';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
import { MilestoneDetailModal } from '../components/goals/MilestoneDetailModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { GoalCard, GoalStatusTabs } from '../components/presentation/GoalPresentation';
import type { GoalFilter } from '../components/presentation/GoalPresentation';
import { AppCard } from '../components/ui/AppCard';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { layout, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import {
  CreateGoalInput,
  GoalMilestoneWithTasks,
  GoalWithMilestones,
} from '../features/goals/goalTypes';
import { hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useUserProfile } from '../features/profile/useUserProfile';
import { useGoals } from '../features/goals/useGoals';
import { useMilestoneEvents } from '../features/goals/useMilestoneEvents';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useTasks } from '../features/tasks/useTasks';
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
    goBack?: () => void;
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
    setGoalManuallyCompleted,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    setMilestoneManuallyCompleted,
    reorderMilestones,
    retry,
  } = useGoals();
  const { createTask } = useTasks();
  const [createGoalVisible, setCreateGoalVisible] = useState(false);
  const [addMilestoneVisible, setAddMilestoneVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [scheduleMilestoneId, setScheduleMilestoneId] = useState<string | null>(null);
  const [taskMilestoneId, setTaskMilestoneId] = useState<string | null>(null);
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
  const selectedMilestone =
    selectedGoal?.milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? null;
  const scheduleMilestone =
    goals
      .flatMap((goal) => goal.milestones)
      .find((milestone) => milestone.id === scheduleMilestoneId) ?? null;
  const scheduleGoal =
    goals.find((goal) =>
      goal.milestones.some((milestone) => milestone.id === scheduleMilestoneId),
    ) ?? null;
  const { events: linkedEvents, uiState: linkedEventsState } = useMilestoneEvents(
    selectedMilestone?.id ?? null,
  );

  async function handleCreateGoal(input: CreateGoalInput): Promise<void> {
    await createGoal(input);
    setCreateGoalVisible(false);
  }

  async function handleCreateMilestone(input: {
    title: string;
    description: string;
  }): Promise<void> {
    if (!selectedGoal) {
      throw new Error('Goal not found.');
    }

    await createMilestone(selectedGoal.id, input);
  }

  async function handleDeleteMilestone(milestone: GoalMilestoneWithTasks): Promise<void> {
    await deleteMilestone(milestone.id);
    setSelectedMilestoneId(null);
  }

  async function handleSaveGoal(
    goalId: string,
    fields: { title: string; description: string; estimatedCompletionDate: Date },
  ): Promise<void> {
    await updateGoal(goalId, fields);
  }

  async function handleSaveMilestone(
    milestoneId: string,
    fields: { title: string; description: string },
  ): Promise<void> {
    await updateMilestone(milestoneId, fields);
  }

  async function handleScheduleMilestoneEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    await createEvent(input, options);
    setScheduleMilestoneId(null);
  }

  function openGoal(goal: GoalWithMilestones): void {
    if (navigation?.navigate) {
      navigation.navigate('GoalDetail', { goalId: goal.id });
      return;
    }

    setSelectedGoalId(goal.id);
  }

  function closeGoalDetails(): void {
    setSelectedGoalId(null);
    setSelectedMilestoneId(null);
    setAddMilestoneVisible(false);
    setAddTaskVisible(false);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top },
          { paddingBottom: spacing['3xl'] + insets.bottom },
        ]}
      >
        <ScreenHeader
          title="Goals"
          onPressBack={() => {
            if (navigation?.goBack) {
              navigation.goBack();
            } else {
              navigation?.getParent?.()?.navigate?.('Plan');
            }
          }}
        />
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
              Pulling in your goals, milestones, and task progress.
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
        visible={selectedGoal !== null && !addMilestoneVisible && !addTaskVisible}
        onClose={closeGoalDetails}
        onSaveGoal={handleSaveGoal}
        onToggleGoalManualCompletion={setGoalManuallyCompleted}
        onAddMilestone={() => setAddMilestoneVisible(true)}
        onOpenMilestone={(milestone) => setSelectedMilestoneId(milestone.id)}
        onToggleMilestoneCompletion={(milestone, completed) =>
          setMilestoneManuallyCompleted(milestone.id, completed)
        }
        onReorderMilestones={reorderMilestones}
      />

      <AddMilestoneModal
        visible={addMilestoneVisible}
        onClose={() => setAddMilestoneVisible(false)}
        onSave={handleCreateMilestone}
      />

      <MilestoneDetailModal
        goalTitle={selectedGoal?.title ?? scheduleGoal?.title ?? 'Goal'}
        milestone={selectedMilestone}
        visible={selectedMilestone !== null}
        linkedEvents={linkedEvents}
        linkedEventsState={linkedEventsState}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => setSelectedMilestoneId(null)}
        onSaveMilestone={handleSaveMilestone}
        onDeleteMilestone={handleDeleteMilestone}
        onSchedule={(milestone) => setScheduleMilestoneId(milestone.id)}
        onAddTask={(milestone) => {
          setSelectedMilestoneId(null);
          setTaskMilestoneId(milestone.id);
          setAddTaskVisible(true);
        }}
        onToggleManualCompletion={(milestone, completed) =>
          setMilestoneManuallyCompleted(milestone.id, completed)
        }
      />

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => {
          setAddTaskVisible(false);
          setTaskMilestoneId(null);
        }}
        onSave={createTask}
        initialGoalId={selectedGoal?.id ?? null}
        initialMilestoneId={taskMilestoneId}
        contextLabel={
          selectedGoal?.milestones.find((milestone) => milestone.id === taskMilestoneId)
            ? `Milestone: ${selectedGoal.milestones.find((milestone) => milestone.id === taskMilestoneId)?.title}`
            : 'Linked to this goal'
        }
      />

      <AddEventModal
        visible={scheduleMilestone !== null}
        modalTitle="Schedule Milestone Event"
        initialDate={scheduleGoal?.estimatedCompletionDate ?? new Date()}
        initialValues={
          scheduleMilestone
            ? {
                title: scheduleMilestone.title,
                description: scheduleMilestone.description,
                goalId: scheduleGoal?.id ?? null,
                milestoneId: scheduleMilestone.id,
              }
            : undefined
        }
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => setScheduleMilestoneId(null)}
        onSave={handleScheduleMilestoneEvent}
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
  });
