import { useMemo, useState } from 'react';
import { NavigationProp, useIsFocused, useNavigation } from '@react-navigation/native';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddMilestoneModal } from '../components/goals/AddMilestoneModal';
import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
import { MilestoneDetailModal } from '../components/goals/MilestoneDetailModal';
import { GoalTimeline, getGoalProgressPercent } from '../components/presentation/GoalPresentation';
import { TaskRow } from '../components/presentation/TaskRow';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { ProgressBar } from '../components/ui/ProgressBar';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { RowContextMenu } from '../components/ui/RowContextMenu';
import { useThemedStyles } from '../design/useThemedStyles';
import { spacing } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { CreateGoalMilestoneInput, GoalWithMilestones } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { sortGoalTasks } from '../features/goals/goalHelpers';
import { useTasks } from '../features/tasks/useTasks';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';
import { AppTabParamList, PlanStackParamList } from '../navigation/navigationTypes';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { TaskListRow, formatTaskDateLabel } from '../components/tasks/TaskListRow';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const DETAIL_TABS = ['tasks', 'overview'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

type GoalDetailScreenProps = {
  route: { params: PlanStackParamList['GoalDetail'] };
};

function formatTaskContext(task: TaskRecord, goal: GoalWithMilestones, locale?: string): string {
  const milestone = task.milestoneId
    ? goal.milestones.find((candidate) => candidate.id === task.milestoneId)
    : null;
  const date = task.dueDate ?? task.scheduledStart;
  const dateText = date
    ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    : 'Unscheduled';
  return milestone ? `${milestone.title} · ${dateText}` : dateText;
}

export function GoalDetailScreen({ route }: GoalDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const isFocused = useIsFocused();
  const { profile } = useUserProfile();
  const { publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const {
    goals,
    uiState,
    updateGoal,
    deleteGoal,
    activateGoalDraft,
    setGoalManuallyCompleted,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    reorderMilestones,
    retry,
  } = useGoals();
  const {
    tasks,
    createTask,
    updateTask,
    completeTask,
    reactivateTask,
    convertTaskToEvent,
    deleteTask,
  } = useTasks();
  const [activeTab, setActiveTab] = useState<DetailTab>(
    route.params.initialTab === 'timeline' ? 'overview' : (route.params.initialTab ?? 'tasks'),
  );
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [taskMilestoneId, setTaskMilestoneId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);
  const [editGoalVisible, setEditGoalVisible] = useState(false);
  const [deleteGoalVisible, setDeleteGoalVisible] = useState(false);
  const [goalActionWorking, setGoalActionWorking] = useState(false);
  const [addMilestoneVisible, setAddMilestoneVisible] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [activatingDraft, setActivatingDraft] = useState(false);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);

  const goal = useMemo(
    () => goals.find((candidate) => candidate.id === route.params.goalId) ?? null,
    [goals, route.params.goalId],
  );
  const goalTasks = useMemo(
    () => sortGoalTasks(tasks.filter((task) => task.goalId === goal?.id)),
    [goal?.id, tasks],
  );
  const nextTask = goalTasks.find((task) => task.status === 'active') ?? null;
  const selectedTask = goalTasks.find((task) => task.id === selectedTaskId) ?? null;
  const editingTask = goalTasks.find((task) => task.id === editingTaskId) ?? null;
  const scheduleTask = goalTasks.find((task) => task.id === scheduleTaskId) ?? null;
  const startNowTask = goalTasks.find((task) => task.id === startNowTaskId) ?? null;
  const selectedMilestone =
    goal?.milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? null;
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;

  async function handleCreateTask(input: CreateTaskInput): Promise<void> {
    await createTask(input);
    setAddTaskVisible(false);
    setTaskMilestoneId(null);
  }

  async function handleActivateDraft(): Promise<void> {
    if (!goal || !activateGoalDraft) return;
    setActivatingDraft(true);
    setDraftActionError(null);
    try {
      await activateGoalDraft(goal.id);
    } catch {
      setDraftActionError('Failed to activate goal draft.');
    } finally {
      setActivatingDraft(false);
    }
  }

  async function handleUpdateTask(taskId: string, fields: UpdateTaskInput): Promise<void> {
    await updateTask(taskId, fields);
  }

  async function handleGoalCompletion(completed: boolean): Promise<void> {
    if (!goal || goalActionWorking) return;
    setGoalActionWorking(true);
    try {
      await setGoalManuallyCompleted(goal.id, completed);
    } catch (error) {
      Alert.alert(
        'Unable to update goal',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setGoalActionWorking(false);
    }
  }

  async function handleDeleteGoal(): Promise<void> {
    if (!goal || goalActionWorking) return;
    setGoalActionWorking(true);
    try {
      await deleteGoal(goal.id);
      setDeleteGoalVisible(false);
      navigation.goBack();
    } catch {
      Alert.alert('Unable to delete goal', 'Please try again.');
    } finally {
      setGoalActionWorking(false);
    }
  }

  async function handleDeleteTask(): Promise<void> {
    if (!pendingDeleteTask) return;
    try {
      await deleteTask(pendingDeleteTask.id);
      setSelectedTaskId(null);
      setEditingTaskId(null);
      setPendingDeleteTask(null);
    } catch {
      Alert.alert('Unable to delete task', 'Please try again.');
    }
  }

  function confirmDeleteTask(task: TaskRecord): void {
    setPendingDeleteTask(task);
  }

  async function handleReactivateTask(task: TaskRecord): Promise<void> {
    if (goal?.status === 'draft') return;
    try {
      await reactivateTask(task.id);
      setSelectedTaskId(null);
    } catch {
      Alert.alert('Unable to reactivate task', 'Please try again.');
    }
  }

  async function handleToggleTask(task: TaskRecord): Promise<void> {
    await completeTask(task.id, { completionSource: 'manual' });
  }

  async function handleScheduleTaskEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (goal?.status === 'draft') throw new Error('Activate the goal before scheduling tasks.');
    if (!scheduleTask) throw new Error('Task not found.');
    const conversion = await convertTaskToEvent(scheduleTask.id, input);
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setScheduleTaskId(null);
    setSelectedTaskId(null);
  }

  async function handleStartNow(minutes: number, options: CreateEventOptions): Promise<void> {
    if (goal?.status === 'draft') throw new Error('Activate the goal before starting tasks.');
    if (!startNowTask) throw new Error('Task not found.');
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const eventInput: CreateEventInput = {
      title: startNowTask.title,
      description: startNowTask.description,
      startAt,
      endAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      goalId: startNowTask.goalId,
      milestoneId: startNowTask.milestoneId,
    };
    const conversion = await convertTaskToEvent(startNowTask.id, eventInput);
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setStartNowTaskId(null);
    setSelectedTaskId(null);
    navigation.navigate('Calendar', {
      screen: 'CalendarHome',
      params: {
        focusLaunch: {
          token: `${conversion.eventId}-${Date.now()}`,
          eventId: conversion.eventId,
          title: conversion.eventInput.title,
          description: conversion.eventInput.description,
          startAtIso: conversion.eventInput.startAt.toISOString(),
          endAtIso: conversion.eventInput.endAt.toISOString(),
          timezone: conversion.eventInput.timezone,
        },
      },
    });
  }

  async function handleCreateMilestone(
    input: Pick<CreateGoalMilestoneInput, 'title' | 'description'>,
  ): Promise<void> {
    if (!goal) throw new Error('Goal not found.');
    await createMilestone(goal.id, input);
    setAddMilestoneVisible(false);
  }

  async function handleSaveMilestone(
    milestoneId: string,
    fields: { title: string; description: string; estimatedFinishDate?: Date | null },
  ): Promise<void> {
    await updateMilestone(milestoneId, fields);
  }

  function renderTaskListRow(task: TaskRecord) {
    return (
      <TaskListRow
        key={task.id}
        task={task}
        dateLabel={formatTaskDateLabel(task, profile?.locale)}
        onPress={() => setSelectedTaskId(task.id)}
        onComplete={goal?.status === 'draft' ? undefined : () => handleToggleTask(task)}
        onReactivate={
          goal?.status === 'draft' || task.status !== 'completed'
            ? undefined
            : () => void handleReactivateTask(task)
        }
        onEdit={() => setEditingTaskId(task.id)}
        onDelete={() => confirmDeleteTask(task)}
      />
    );
  }

  if (uiState === 'loading') {
    return (
      <View style={styles.screen}>
        <AppCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>Loading goal...</Text>
          <Text style={styles.stateDescription}>Pulling in the goal and its milestones.</Text>
        </AppCard>
      </View>
    );
  }

  if (uiState === 'error') {
    return (
      <View style={styles.screen}>
        <RecoveryCard
          title="Unable to load goal."
          description="Check your connection, then retry."
          onRetry={retry}
        />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="goal"
          title="Goal unavailable"
          description="This goal may have been removed or is still syncing."
          actionLabel="Back to goals"
          onPressAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="goal-detail-scroll"
        nestedScrollEnabled
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.sm + insets.top,
            paddingBottom: spacing.xl + insets.bottom,
          },
        ]}
      >
        <View style={styles.detailHeader}>
          <IconButton
            name="back"
            accessibilityLabel="Back to goals"
            onPress={() => navigation.goBack()}
          />
          <View style={styles.detailHeaderCopy}>
            <Text numberOfLines={1} style={styles.detailTitle}>
              {goal.title}
            </Text>
            <Text style={styles.detailProgressText}>{getGoalProgressPercent(goal)}% complete</Text>
          </View>
          <RowContextMenu
            accessibilityLabel="Goal actions"
            menuAccessibilityLabel="Goal actions menu"
            disabled={goalActionWorking}
            items={[
              {
                label: 'Edit',
                accessibilityLabel: 'Edit goal',
                icon: 'edit',
                onPress: () => setEditGoalVisible(true),
              },
              ...(goal.status === 'active'
                ? [
                    {
                      label: 'Complete',
                      accessibilityLabel: 'Complete goal',
                      icon: 'complete' as const,
                      onPress: () => void handleGoalCompletion(true),
                    },
                  ]
                : goal.status === 'completed'
                  ? [
                      {
                        label: 'Uncomplete',
                        accessibilityLabel: 'Uncomplete goal',
                        icon: 'refresh' as const,
                        onPress: () => void handleGoalCompletion(false),
                      },
                    ]
                  : []),
              {
                label: 'Delete',
                accessibilityLabel: 'Delete goal',
                icon: 'delete',
                tone: 'danger',
                onPress: () => setDeleteGoalVisible(true),
              },
            ]}
          />
        </View>
        <ProgressBar
          accessibilityLabel={`Goal progress ${goal.title}`}
          value={getGoalProgressPercent(goal)}
          max={100}
          accent="brand"
          accessibilityValueText={`${getGoalProgressPercent(goal)}% complete`}
        />
        {goal.status === 'draft' ? (
          <View style={styles.section}>
            <AppButton
              label="Make Active"
              accessibilityLabel="Make goal active"
              onPress={() => void handleActivateDraft()}
              loading={activatingDraft}
              loadingLabel="Activating..."
            />
            {draftActionError ? (
              <Text style={styles.stateDescription}>{draftActionError}</Text>
            ) : null}
          </View>
        ) : null}
        <View accessibilityLabel="Goal detail tabs" style={styles.tabRow}>
          {DETAIL_TABS.map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
            >
              <Text style={[styles.tabLabel, activeTab === tab ? styles.tabLabelActive : null]}>
                {tab === 'tasks' ? 'Tasks' : 'Overview'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'tasks' ? (
          <View style={styles.section}>
            <View testID="goal-next-up-header" style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Next Up
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add task"
                onPress={() => {
                  setTaskMilestoneId(goal.nextMilestone?.id ?? null);
                  setAddTaskVisible(true);
                }}
                style={({ pressed }) => [styles.addItemButton, pressed && styles.textButtonPressed]}
              >
                <Text style={styles.addItemText}>+ Add Task</Text>
              </Pressable>
            </View>
            {nextTask ? (
              <AppCard style={styles.nextTaskCard}>
                <TaskRow
                  task={nextTask}
                  context={formatTaskContext(nextTask, goal, profile?.locale)}
                  onPress={() => setSelectedTaskId(nextTask.id)}
                  onToggleComplete={
                    goal.status === 'draft' ? undefined : () => handleToggleTask(nextTask)
                  }
                  onEdit={() => setEditingTaskId(nextTask.id)}
                  onDelete={() => confirmDeleteTask(nextTask)}
                />
              </AppCard>
            ) : (
              <EmptyState
                title="No next task"
                description="Add a task to give this goal a clear next move."
                presentation="compact"
                style={styles.taskEmptyState}
              />
            )}
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              All tasks
            </Text>
            {goalTasks.length === 0 ? (
              <Text style={styles.taskEmptyDescription}>
                Tasks linked to this goal will appear here.
              </Text>
            ) : (
              <ScrollView
                testID="goal-detail-task-list"
                accessibilityLabel="All goal tasks"
                nestedScrollEnabled
                style={{ maxHeight: (windowHeight - insets.top - insets.bottom) * 0.45 }}
                contentContainerStyle={styles.taskListContent}
              >
                {goalTasks.map(renderTaskListRow)}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View testID="goal-overview-summary" style={styles.section}>
              <Text testID="goal-finish-date" style={styles.overviewFinishDate}>
                Finish date:{' '}
                {goal.estimatedCompletionDate.toLocaleDateString(profile?.locale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Description
              </Text>
              <Text style={styles.overviewDescription}>
                {goal.description || 'No description yet.'}
              </Text>
            </View>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Milestones
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add milestone"
              onPress={() => setAddMilestoneVisible(true)}
              style={({ pressed }) => [styles.addItemButton, pressed && styles.textButtonPressed]}
            >
              <Text style={styles.addItemText}>+ Add Milestone</Text>
            </Pressable>
            {goal.milestones.length === 0 ? (
              <Text style={styles.stateDescription}>
                No milestones yet. Add one to break this goal into smaller steps.
              </Text>
            ) : (
              <ScrollView
                testID="goal-detail-milestone-list"
                accessibilityLabel="Goal milestones"
                nestedScrollEnabled
                style={{ maxHeight: (windowHeight - insets.top - insets.bottom) * 0.45 }}
              >
                <GoalTimeline
                  key={goal.id}
                  milestones={goal.milestones}
                  onPressMilestone={(milestone) => setSelectedMilestoneId(milestone.id)}
                  renderMilestoneTasks={(milestone) => {
                    const milestoneTasks = goalTasks.filter(
                      (task) => task.milestoneId === milestone.id,
                    );
                    return (
                      <View
                        testID={`milestone-tasks-${milestone.id}`}
                        style={[styles.taskListContent, styles.milestoneTaskListContent]}
                      >
                        {milestoneTasks.length === 0 ? (
                          <Text style={styles.stateDescription}>No tasks in this milestone.</Text>
                        ) : (
                          milestoneTasks.map(renderTaskListRow)
                        )}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add task to milestone ${milestone.title}`}
                          onPress={() => {
                            setTaskMilestoneId(milestone.id);
                            setAddTaskVisible(true);
                          }}
                          style={({ pressed }) => [
                            styles.addItemButton,
                            pressed && styles.textButtonPressed,
                          ]}
                        >
                          <Text style={styles.addItemText}>+ Add Task</Text>
                        </Pressable>
                      </View>
                    );
                  }}
                />
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => {
          setAddTaskVisible(false);
          setTaskMilestoneId(null);
        }}
        onSave={handleCreateTask}
        goals={goals}
        allowedDraftGoalId={goal.status === 'draft' ? goal.id : null}
        initialGoalId={goal.id}
        initialMilestoneId={taskMilestoneId}
      />
      <TaskDetailsModal
        visible={
          selectedTask !== null &&
          editingTask === null &&
          scheduleTask === null &&
          startNowTask === null
        }
        task={selectedTask}
        goals={goals}
        locale={profile?.locale}
        timeFormat={timeFormat}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => setEditingTaskId(task.id)}
        onDelete={confirmDeleteTask}
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
        onReactivate={handleReactivateTask}
        taskActionsEnabled={goal.status !== 'draft'}
      />
      <EditTaskModal
        visible={editingTask !== null}
        task={editingTask}
        goals={goals}
        allowedDraftGoalId={goal.status === 'draft' ? goal.id : null}
        onClose={() => setEditingTaskId(null)}
        onSave={handleUpdateTask}
      />
      <ConfirmationModal
        visible={pendingDeleteTask !== null}
        title="Delete task?"
        message={
          pendingDeleteTask ? `"${pendingDeleteTask.title}" will be permanently deleted.` : ''
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete task"
        icon="delete"
        iconTone="danger"
        onCancel={() => setPendingDeleteTask(null)}
        onConfirm={() => void handleDeleteTask()}
      />
      <AddEventModal
        visible={scheduleTask !== null}
        modalTitle="Schedule Task"
        initialDate={scheduleTask?.dueDate ?? new Date()}
        initialValues={
          scheduleTask
            ? {
                title: scheduleTask.title,
                description: scheduleTask.description,
                goalId: scheduleTask.goalId,
                milestoneId: scheduleTask.milestoneId,
              }
            : undefined
        }
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={timeFormat}
        fullScreen
        onClose={() => setScheduleTaskId(null)}
        onSave={handleScheduleTaskEvent}
      />
      <StartNowModal
        visible={startNowTask !== null}
        task={startNowTask}
        publicationCalendarTitle={publicationCalendarTitle}
        fullScreen
        onClose={() => setStartNowTaskId(null)}
        onConfirm={handleStartNow}
      />
      <GoalDetailsModal
        goal={goal}
        visible={editGoalVisible}
        initialEditMode
        onClose={() => setEditGoalVisible(false)}
        onSaveGoal={async (goalId, fields) => {
          await updateGoal(goalId, fields);
          setEditGoalVisible(false);
        }}
        onActivateDraft={activateGoalDraft}
        onToggleGoalManualCompletion={setGoalManuallyCompleted}
        onAddMilestone={() => {
          setEditGoalVisible(false);
          setAddMilestoneVisible(true);
        }}
        onOpenMilestone={(milestone) => {
          setEditGoalVisible(false);
          setSelectedMilestoneId(milestone.id);
        }}
        onReorderMilestones={reorderMilestones}
      />
      <ConfirmationModal
        visible={deleteGoalVisible}
        title="Delete goal?"
        message={`"${goal.title}" and its milestones will be permanently deleted. Tasks, calendar events, and notes will be kept with their goal and milestone links removed.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete goal"
        icon="delete"
        iconTone="danger"
        loading={goalActionWorking}
        onCancel={() => setDeleteGoalVisible(false)}
        onConfirm={() => void handleDeleteGoal()}
      />
      <AddMilestoneModal
        visible={addMilestoneVisible}
        onClose={() => setAddMilestoneVisible(false)}
        onSave={handleCreateMilestone}
      />
      <MilestoneDetailModal
        goalTitle={goal.title}
        milestone={selectedMilestone}
        visible={selectedMilestone !== null && isFocused}
        locale={profile?.locale}
        goalEstimatedCompletionDate={goal.estimatedCompletionDate}
        onClose={() => setSelectedMilestoneId(null)}
        onSaveMilestone={handleSaveMilestone}
        onOpenTask={(task) =>
          navigation.navigate('Plan', { screen: 'TaskDetail', params: { taskId: task.id } })
        }
        onDeleteMilestone={async (milestone) => {
          await deleteMilestone(milestone.id);
          setSelectedMilestoneId(null);
        }}
        onAddTask={(milestone) => {
          setSelectedMilestoneId(null);
          setTaskMilestoneId(milestone.id);
          setAddTaskVisible(true);
        }}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      flexGrow: 1,
      padding: theme.layout.pagePaddingHorizontal,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing['3xl'],
      gap: theme.spacing.lg,
    },
    stateCard: { margin: theme.layout.pagePaddingHorizontal, gap: theme.spacing.sm },
    stateTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    stateDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
    taskEmptyState: { alignItems: 'center' },
    taskEmptyDescription: { ...theme.typography.body, color: theme.colors.textPrimary },
    overviewDescription: { ...theme.typography.helper, color: theme.colors.textPrimary },
    overviewFinishDate: {
      ...theme.typography.helper,
      color: theme.colors.textEmphasis,
      fontWeight: '700',
    },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    detailHeaderCopy: { flex: 1, gap: theme.spacing.xs },
    detailTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
    detailProgressText: {
      ...theme.typography.helper,
      color: theme.colors.brand,
      fontWeight: '700',
    },
    tabRow: {
      flexDirection: 'row',
      padding: 4,
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radii.lg,
    },
    tab: {
      flex: 1,
      minHeight: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
    tabActive: { backgroundColor: theme.colors.surfaceBrand },
    tabLabel: { ...theme.typography.helper, color: theme.colors.textSecondary },
    tabLabelActive: { color: theme.colors.brand, fontWeight: '700' },
    section: { gap: theme.spacing.sm },
    taskListContent: { gap: theme.spacing.sm },
    milestoneTaskListContent: {
      marginLeft: theme.spacing.md,
      paddingLeft: theme.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
    },
    addItemButton: {
      minHeight: theme.layout.minimumTouchTarget,
      alignSelf: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.md,
    },
    addItemText: { ...theme.typography.label, color: theme.colors.brand, fontWeight: '700' },
    textButtonPressed: { opacity: 0.68 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionTitle: { ...theme.typography.label, color: theme.colors.textSecondary, flex: 1 },
    nextTaskCard: { paddingVertical: theme.spacing.sm },
  });
