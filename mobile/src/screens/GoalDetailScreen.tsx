import { useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
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
import { GoalWithTasks } from '../features/goals/goalTypes';
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

function formatTaskContext(task: TaskRecord, locale?: string): string {
  const date = task.dueDate ?? task.scheduledStart;
  const dateText = date
    ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    : 'Unscheduled';
  return task.starter ? `${task.starter} · ${dateText}` : dateText;
}

export function GoalDetailScreen({ route }: GoalDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const { profile } = useUserProfile();
  const { publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const { goals, uiState, updateGoal, markGoalCompleted, retry } = useGoals();
  const { tasks, createTask, updateTask, completeTask, convertTaskToEvent, deleteTask } =
    useTasks();
  const [activeTab, setActiveTab] = useState<DetailTab>(route.params.initialTab ?? 'tasks');
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);
  const [editGoalVisible, setEditGoalVisible] = useState(false);

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
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;

  async function handleCreateTask(input: CreateTaskInput): Promise<void> {
    await createTask(input);
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
      taskId: startNowTask.id,
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

  if (uiState === 'loading') {
    return (
      <View style={styles.screen}>
        <AppCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>Loading goal...</Text>
          <Text style={styles.stateDescription}>Pulling in the goal and its ordered tasks.</Text>
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
                onPress={() => setAddTaskVisible(true)}
              />
            </View>
            {nextTask ? (
              <AppCard style={styles.nextTaskCard}>
                <TaskRow
                  task={nextTask}
                  context={formatTaskContext(nextTask, profile?.locale)}
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
                onPressAction={() => setAddTaskVisible(true)}
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
                  context={formatTaskContext(task, profile?.locale)}
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
                label="Add task"
                variant="secondary"
                onPress={() => setAddTaskVisible(true)}
              />
            </View>
            <GoalTimeline tasks={goal.tasks} onPressTask={(task) => setSelectedTaskId(task.id)} />
          </View>
        )}
      </ScrollView>

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => {
          setAddTaskVisible(false);
        }}
        onSave={handleCreateTask}
        goals={goals}
        initialGoalId={goal.id}
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
                taskId: scheduleTask.id,
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
        onMarkGoalCompleted={markGoalCompleted}
        onAddTask={() => {
          setEditGoalVisible(false);
          setAddTaskVisible(true);
        }}
        onOpenTask={(task) => {
          setEditGoalVisible(false);
          setSelectedTaskId(task.id);
        }}
        onToggleTaskStatus={handleToggleTask}
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
