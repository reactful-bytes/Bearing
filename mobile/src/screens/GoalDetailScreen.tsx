import { useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useThemedStyles } from '../design/useThemedStyles';
import { spacing } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useMilestoneEvents } from '../features/goals/useMilestoneEvents';
import { CreateGoalMilestoneInput, GoalWithMilestones } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';
import { AppTabParamList, PlanStackParamList } from '../navigation/navigationTypes';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';

const DETAIL_TABS = ['tasks', 'timeline'] as const;
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
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const { profile } = useUserProfile();
  const { createEvent, publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const {
    goals,
    uiState,
    updateGoal,
    setGoalManuallyCompleted,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    setMilestoneManuallyCompleted,
    reorderMilestones,
    retry,
  } = useGoals();
  const { tasks, createTask, updateTask, completeTask, convertTaskToEvent, deleteTask } =
    useTasks();
  const [activeTab, setActiveTab] = useState<DetailTab>(route.params.initialTab ?? 'tasks');
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [taskMilestoneId, setTaskMilestoneId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);
  const [editGoalVisible, setEditGoalVisible] = useState(false);
  const [addMilestoneVisible, setAddMilestoneVisible] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [scheduleMilestoneId, setScheduleMilestoneId] = useState<string | null>(null);

  const goal = useMemo(
    () => goals.find((candidate) => candidate.id === route.params.goalId) ?? null,
    [goals, route.params.goalId],
  );
  const goalTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.goalId === goal?.id)
        .sort((left, right) => {
          if (left.status !== right.status) return left.status === 'active' ? -1 : 1;
          return left.updatedAt.getTime() - right.updatedAt.getTime();
        }),
    [goal?.id, tasks],
  );
  const nextTask = goalTasks.find((task) => task.status === 'active') ?? null;
  const selectedTask = goalTasks.find((task) => task.id === selectedTaskId) ?? null;
  const scheduleTask = goalTasks.find((task) => task.id === scheduleTaskId) ?? null;
  const startNowTask = goalTasks.find((task) => task.id === startNowTaskId) ?? null;
  const selectedMilestone =
    goal?.milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? null;
  const scheduleMilestone =
    goal?.milestones.find((milestone) => milestone.id === scheduleMilestoneId) ?? null;
  const { events: linkedEvents, uiState: linkedEventsState } = useMilestoneEvents(
    selectedMilestone?.id ?? null,
  );
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;

  async function handleCreateTask(input: CreateTaskInput): Promise<void> {
    await createTask(input);
    setAddTaskVisible(false);
    setTaskMilestoneId(null);
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

  async function handleScheduleTaskEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (!scheduleTask) throw new Error('Task not found.');
    const conversion = await convertTaskToEvent(scheduleTask.id, input, 'scheduled');
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setScheduleTaskId(null);
    setSelectedTaskId(null);
  }

  async function handleStartNow(minutes: number, options: CreateEventOptions): Promise<void> {
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
    const conversion = await convertTaskToEvent(startNowTask.id, eventInput, 'start_now');
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
    fields: { title: string; description: string },
  ): Promise<void> {
    await updateMilestone(milestoneId, fields);
  }

  async function handleScheduleMilestoneEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (!scheduleMilestone) throw new Error('Milestone not found.');
    await createEvent(input, options);
    setScheduleMilestoneId(null);
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
          <IconButton
            name="more"
            accessibilityLabel="Edit goal"
            onPress={() => setEditGoalVisible(true)}
          />
        </View>
        <ProgressBar
          accessibilityLabel={`Goal progress ${goal.title}`}
          value={getGoalProgressPercent(goal)}
          max={100}
          accent="brand"
          accessibilityValueText={`${getGoalProgressPercent(goal)}% complete`}
        />
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
                {tab === 'tasks' ? 'Tasks' : 'Timeline'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'tasks' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Next Up
              </Text>
              <AppButton
                label="Add task"
                variant="secondary"
                onPress={() => {
                  setTaskMilestoneId(goal.nextMilestone?.id ?? null);
                  setAddTaskVisible(true);
                }}
              />
            </View>
            {nextTask ? (
              <AppCard style={styles.nextTaskCard}>
                <TaskRow
                  task={nextTask}
                  context={formatTaskContext(nextTask, goal, profile?.locale)}
                  onPress={() => setSelectedTaskId(nextTask.id)}
                  onToggleComplete={() => void handleToggleTask(nextTask)}
                />
              </AppCard>
            ) : (
              <EmptyState
                icon="task"
                title="No next task"
                description="Add a task to give this goal a clear next move."
                presentation="compact"
                actionLabel="Add task"
                onPressAction={() => {
                  setTaskMilestoneId(goal.nextMilestone?.id ?? null);
                  setAddTaskVisible(true);
                }}
              />
            )}
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              All tasks
            </Text>
            {goalTasks.length === 0 ? (
              <Text style={styles.stateDescription}>
                Tasks linked to this goal will appear here.
              </Text>
            ) : (
              goalTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  context={formatTaskContext(task, goal, profile?.locale)}
                  onPress={() => setSelectedTaskId(task.id)}
                  onToggleComplete={() => void handleToggleTask(task)}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Timeline
              </Text>
              <AppButton
                label="Add milestone"
                variant="secondary"
                onPress={() => setAddMilestoneVisible(true)}
              />
            </View>
            <GoalTimeline
              milestones={goal.milestones}
              onPressMilestone={(milestone) => setSelectedMilestoneId(milestone.id)}
            />
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
        initialGoalId={goal.id}
        initialMilestoneId={taskMilestoneId}
        contextLabel={
          taskMilestoneId
            ? `Milestone: ${goal.milestones.find((milestone) => milestone.id === taskMilestoneId)?.title}`
            : 'Linked to this goal'
        }
      />
      <TaskDetailModal
        visible={selectedTask !== null}
        task={selectedTask}
        locale={profile?.locale}
        timeFormat={timeFormat}
        onClose={() => setSelectedTaskId(null)}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
        onSchedule={(task) => setScheduleTaskId(task.id)}
        onStartNow={(task) => setStartNowTaskId(task.id)}
        onMarkComplete={async (task) => {
          await handleToggleTask(task);
          setSelectedTaskId(null);
        }}
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
        onClose={() => setScheduleTaskId(null)}
        onSave={handleScheduleTaskEvent}
      />
      <StartNowModal
        visible={startNowTask !== null}
        task={startNowTask}
        publicationCalendarTitle={publicationCalendarTitle}
        onClose={() => setStartNowTaskId(null)}
        onConfirm={handleStartNow}
      />
      <GoalDetailsModal
        goal={goal}
        visible={editGoalVisible}
        onClose={() => setEditGoalVisible(false)}
        onSaveGoal={updateGoal}
        onToggleGoalManualCompletion={setGoalManuallyCompleted}
        onAddMilestone={() => {
          setEditGoalVisible(false);
          setAddMilestoneVisible(true);
        }}
        onOpenMilestone={(milestone) => {
          setEditGoalVisible(false);
          setSelectedMilestoneId(milestone.id);
        }}
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
        goalTitle={goal.title}
        milestone={selectedMilestone}
        visible={selectedMilestone !== null}
        linkedEvents={linkedEvents}
        linkedEventsState={linkedEventsState}
        locale={profile?.locale}
        timeFormat={timeFormat}
        onClose={() => setSelectedMilestoneId(null)}
        onSaveMilestone={handleSaveMilestone}
        onDeleteMilestone={async (milestone) => {
          await deleteMilestone(milestone.id);
          setSelectedMilestoneId(null);
        }}
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
      <AddEventModal
        visible={scheduleMilestone !== null}
        modalTitle="Schedule Milestone Event"
        initialDate={goal.estimatedCompletionDate}
        initialValues={
          scheduleMilestone
            ? {
                title: scheduleMilestone.title,
                description: scheduleMilestone.description,
                goalId: goal.id,
                milestoneId: scheduleMilestone.id,
              }
            : undefined
        }
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={timeFormat}
        onClose={() => setScheduleMilestoneId(null)}
        onSave={handleScheduleMilestoneEvent}
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionTitle: { ...theme.typography.label, color: theme.colors.textSecondary, flex: 1 },
    nextTaskCard: { paddingVertical: theme.spacing.sm },
  });
