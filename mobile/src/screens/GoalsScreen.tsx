import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { ScheduleTaskModal } from '../components/tasks/ScheduleTaskModal';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { TaskEditModal } from '../components/tasks/TaskEditModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { GoalCard, GoalStatusTabs } from '../components/presentation/GoalPresentation';
import type { GoalFilter } from '../components/presentation/GoalPresentation';
import { AppCard } from '../components/ui/AppCard';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { layout, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { CreateGoalInput, GoalWithTasks } from '../features/goals/goalTypes';
import { hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useUserProfile } from '../features/profile/useUserProfile';
import { useGoals } from '../features/goals/useGoals';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useTasks } from '../features/tasks/useTasks';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
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
  const { publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const { authUser, isAnonymous, profile } = useUserProfile();
  const { entitlement, uiState: entitlementUiState } = usePremiumEntitlement(authUser?.uid ?? null);
  const { goals, uiState, createGoal, updateGoal, markGoalCompleted, retry } = useGoals();
  const { createTask, updateTask, completeTask, uncompleteTask, convertTaskToEvent, deleteTask } =
    useTasks();
  const [createGoalVisible, setCreateGoalVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);
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
  const selectedTask = selectedGoal?.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const scheduleTask = selectedGoal?.tasks.find((task) => task.id === scheduleTaskId) ?? null;
  const editingTask = selectedGoal?.tasks.find((task) => task.id === editingTaskId) ?? null;
  const startNowTask = selectedGoal?.tasks.find((task) => task.id === startNowTaskId) ?? null;

  async function handleCreateGoal(input: CreateGoalInput): Promise<void> {
    await createGoal(input);
    setCreateGoalVisible(false);
  }

  async function handleCreateTask(input: CreateTaskInput): Promise<void> {
    if (!selectedGoal) {
      throw new Error('Goal not found.');
    }

    await createTask({ ...input, goalId: selectedGoal.id });
    setAddTaskVisible(false);
  }

  async function handleUpdateTask(taskId: string, fields: UpdateTaskInput): Promise<void> {
    await updateTask(taskId, fields);
  }

  async function handleDeleteTask(taskId: string): Promise<void> {
    await deleteTask(taskId);
    setSelectedTaskId(null);
  }

  async function handleToggleTask(task: TaskRecord): Promise<void> {
    await completeTask(task.id, { completionSource: 'manual' });
  }

  async function handleUncompleteTask(task: TaskRecord): Promise<void> {
    await uncompleteTask(task.id);
    setSelectedTaskId(null);
  }

  async function handleScheduleTaskEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (!scheduleTask) throw new Error('Task not found.');
    const conversion = await convertTaskToEvent(scheduleTask.id, input, 'scheduled');
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setScheduleTaskId(null);
  }

  async function handleStartNow(minutes: number, options: CreateEventOptions): Promise<void> {
    if (!startNowTask) throw new Error('Task not found.');
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const input: CreateEventInput = {
      title: startNowTask.title,
      description: startNowTask.description,
      startAt,
      endAt,
      timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      goalId: startNowTask.goalId,
      taskId: startNowTask.id,
    };
    const conversion = await convertTaskToEvent(startNowTask.id, input, 'start_now');
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setStartNowTaskId(null);
    setSelectedTaskId(null);
  }

  async function handleSaveGoal(
    goalId: string,
    fields: { title: string; description: string; estimatedCompletionDate: Date },
  ): Promise<void> {
    await updateGoal(goalId, fields);
  }

  async function handleScheduleTaskFromModal(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    await handleScheduleTaskEvent(input, options);
  }

  function openGoal(goal: GoalWithTasks): void {
    if (navigation?.navigate) {
      navigation.navigate('GoalDetail', { goalId: goal.id });
      return;
    }

    setSelectedGoalId(goal.id);
  }

  function closeGoalDetails(): void {
    setSelectedGoalId(null);
    setSelectedTaskId(null);
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
              Pulling in your current goals and task order.
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
                ? 'Create a goal to start building a task plan.'
                : goalFilter === 'completed'
                  ? 'Goals you finish will stay available here.'
                  : goalFilter === 'archived'
                    ? 'Archived goals will stay available here for reference.'
                    : 'Create your first goal to start building a task plan.'}
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
        visible={selectedGoal !== null && !addTaskVisible}
        onClose={closeGoalDetails}
        onSaveGoal={handleSaveGoal}
        onMarkGoalCompleted={markGoalCompleted}
        onAddTask={() => setAddTaskVisible(true)}
        onOpenTask={(task) => setSelectedTaskId(task.id)}
        onToggleTaskStatus={handleToggleTask}
      />

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => setAddTaskVisible(false)}
        onSave={handleCreateTask}
        initialGoalId={selectedGoal?.id ?? null}
        goals={goals}
        fullScreen
        contextLabel="Linked to this goal"
      />

      <TaskDetailModal
        task={selectedTask}
        visible={selectedTask !== null}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => {
          setSelectedTaskId(null);
          setEditingTaskId(task.id);
        }}
        onDelete={handleDeleteTask}
        onSchedule={(task) => {
          setSelectedTaskId(null);
          setScheduleTaskId(task.id);
        }}
        onStartNow={(task) => {
          setSelectedTaskId(null);
          setStartNowTaskId(task.id);
        }}
        onMarkComplete={async (task) => {
          await handleToggleTask(task);
          setSelectedTaskId(null);
        }}
        onUncomplete={handleUncompleteTask}
        goals={goals}
      />

      <TaskEditModal
        visible={editingTask !== null}
        task={editingTask}
        goals={goals}
        onClose={() => setEditingTaskId(null)}
        onSave={handleUpdateTask}
      />

      <StartNowModal
        visible={startNowTask !== null}
        task={startNowTask}
        publicationCalendarTitle={publicationCalendarTitle}
        onClose={() => setStartNowTaskId(null)}
        onConfirm={handleStartNow}
      />

      <ScheduleTaskModal
        visible={scheduleTask !== null}
        task={scheduleTask}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => setScheduleTaskId(null)}
        onSave={handleScheduleTaskFromModal}
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
