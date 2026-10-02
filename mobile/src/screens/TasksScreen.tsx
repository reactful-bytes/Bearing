import { useEffect, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { TaskHierarchyRow } from '../components/tasks/TaskHierarchyRow';
import { TaskListDropdown } from '../components/tasks/TaskListDropdown';
import { TaskListRow } from '../components/tasks/TaskListRow';
import { AppCard } from '../components/ui/AppCard';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { layout, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useTasks } from '../features/tasks/useTasks';
import { useGoals } from '../features/goals/useGoals';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import { AppTabParamList, PlanStackParamList } from '../navigation/navigationTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';

type TaskFilter = 'active' | 'completed' | 'all';
type TaskGroupBy = 'none' | 'goal' | 'milestone';
type TaskSortBy =
  'dueDate:asc' | 'dueDate:desc' | 'updated:asc' | 'updated:desc' | 'title:asc' | 'title:desc';
type TaskDropdown = 'status' | 'group' | 'sort';
type TaskMilestoneGroup = { id: string; label: string; tasks: TaskRecord[] };
type TaskGroup = {
  id: string;
  label: string;
  kind: 'goal' | 'unlinked';
  tasks: TaskRecord[];
  milestones: TaskMilestoneGroup[];
};

function taskDateLabel(task: TaskRecord, locale?: string): string {
  const date =
    task.status === 'completed' ? task.completedAt : (task.dueDate ?? task.scheduledStart);
  if (!date) return task.status === 'completed' ? 'Completed' : 'No due date';
  const formatted = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (task.status === 'completed') return `Completed ${formatted}`;
  return task.dueDate ? `Due ${formatted}` : `Scheduled ${formatted}`;
}

function compareTasks(left: TaskRecord, right: TaskRecord, sortBy: TaskSortBy): number {
  const [sortKey, direction] = sortBy.split(':') as [string, 'asc' | 'desc'];
  const multiplier = direction === 'asc' ? 1 : -1;
  if (sortKey === 'title') return left.title.localeCompare(right.title) * multiplier;
  if (sortKey === 'updated') {
    return (
      (left.updatedAt.getTime() - right.updatedAt.getTime()) * multiplier ||
      left.title.localeCompare(right.title)
    );
  }

  const leftDate = left.dueDate?.getTime() ?? left.scheduledStart?.getTime() ?? null;
  const rightDate = right.dueDate?.getTime() ?? right.scheduledStart?.getTime() ?? null;
  if (leftDate === null && rightDate !== null) return 1;
  if (rightDate === null && leftDate !== null) return -1;
  if (leftDate !== null && rightDate !== null && leftDate !== rightDate)
    return (leftDate - rightDate) * multiplier;
  return left.title.localeCompare(right.title);
}

type TasksScreenProps = {
  route?: { params?: PlanStackParamList['Tasks'] };
  navigation?: { setParams: (params: PlanStackParamList['Tasks']) => void };
};

export function TasksScreen({ route, navigation: stackNavigation }: TasksScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const { profile } = useUserProfile();
  const { goals, uiState: goalsUiState } = useGoals();
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;
  const { publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const {
    tasks,
    uiState,
    createTask,
    updateTask,
    completeTask,
    reactivateTask,
    convertTaskToEvent,
    deleteTask,
    retry,
  } = useTasks();
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('active');
  const [groupBy, setGroupBy] = useState<TaskGroupBy>('none');
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate:asc');
  const [activeDropdown, setActiveDropdown] = useState<TaskDropdown | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!route?.params?.createTask) {
      return;
    }

    setAddTaskVisible(true);
    stackNavigation?.setParams({ createTask: undefined });
  }, [route?.params?.createTask, stackNavigation]);

  const draftGoalIds = useMemo(
    () => new Set(goals.filter((goal) => goal.status === 'draft').map((goal) => goal.id)),
    [goals],
  );
  const operationalTasks = useMemo(
    () => tasks.filter((task) => !task.goalId || !draftGoalIds.has(task.goalId)),
    [draftGoalIds, tasks],
  );
  const selectedTask = useMemo(
    () => operationalTasks.find((task) => task.id === selectedTaskId) ?? null,
    [operationalTasks, selectedTaskId],
  );
  const editingTask = useMemo(
    () => operationalTasks.find((task) => task.id === editingTaskId) ?? null,
    [editingTaskId, operationalTasks],
  );
  const scheduleTask = useMemo(
    () => operationalTasks.find((task) => task.id === scheduleTaskId) ?? null,
    [operationalTasks, scheduleTaskId],
  );
  const startNowTask = useMemo(
    () => operationalTasks.find((task) => task.id === startNowTaskId) ?? null,
    [operationalTasks, startNowTaskId],
  );
  const activeTaskCount = useMemo(
    () => operationalTasks.filter((task) => task.status === 'active').length,
    [operationalTasks],
  );
  const completedTaskCount = operationalTasks.length - activeTaskCount;
  const visibleTasks = useMemo(() => {
    const filtered =
      taskFilter === 'all'
        ? operationalTasks
        : operationalTasks.filter((task) => task.status === taskFilter);
    return [...filtered].sort((left, right) => compareTasks(left, right, sortBy));
  }, [operationalTasks, sortBy, taskFilter]);
  const taskGroups = useMemo(() => {
    if (groupBy === 'none') return [];
    const groups = new Map<string, TaskGroup>();
    for (const task of visibleTasks) {
      const goal = task.goalId ? goals.find((candidate) => candidate.id === task.goalId) : null;
      const id = task.goalId ?? 'unlinked';
      const group = groups.get(id) ?? {
        id,
        label: goal?.title ?? (task.goalId ? 'Linked goal unavailable' : 'Unlinked tasks'),
        kind: task.goalId ? ('goal' as const) : ('unlinked' as const),
        tasks: [],
        milestones: [],
      };
      if (groupBy === 'goal' || !goal || !task.milestoneId) {
        group.tasks.push(task);
      } else {
        const milestone = goal.milestones.find((candidate) => candidate.id === task.milestoneId);
        const milestoneGroup = group.milestones.find(
          (candidate) => candidate.id === task.milestoneId,
        );
        if (milestoneGroup) {
          milestoneGroup.tasks.push(task);
        } else {
          group.milestones.push({
            id: task.milestoneId,
            label: milestone?.title ?? 'Milestone unavailable',
            tasks: [task],
          });
        }
      }
      groups.set(id, group);
    }
    return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [goals, groupBy, visibleTasks]);

  async function handleCreateTask(input: CreateTaskInput): Promise<void> {
    await createTask(input);
  }

  async function handleUpdateTask(taskId: string, fields: UpdateTaskInput): Promise<void> {
    await updateTask(taskId, fields);
  }

  async function handleDeleteTask(): Promise<void> {
    if (!pendingDeleteTask) return;
    try {
      await deleteTask(pendingDeleteTask.id);
      setSelectedTaskId((current) => (current === pendingDeleteTask.id ? null : current));
      setEditingTaskId((current) => (current === pendingDeleteTask.id ? null : current));
      setScheduleTaskId((current) => (current === pendingDeleteTask.id ? null : current));
      setStartNowTaskId((current) => (current === pendingDeleteTask.id ? null : current));
      setPendingDeleteTask(null);
    } catch {
      Alert.alert('Unable to delete task', 'Please try again.');
    }
  }

  function confirmDeleteTask(task: TaskRecord): void {
    setPendingDeleteTask(task);
  }

  async function handleReactivateTask(task: TaskRecord): Promise<void> {
    try {
      await reactivateTask(task.id);
      setSelectedTaskId(null);
    } catch {
      Alert.alert('Unable to reactivate task', 'Please try again.');
    }
  }

  async function handleMarkTaskComplete(task: TaskRecord): Promise<void> {
    await completeTask(task.id, {
      completionSource: 'manual',
    });
    setSelectedTaskId(null);
  }

  function toggleGroup(id: string): void {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderTaskRow(task: TaskRecord, nested = false) {
    return (
      <View key={task.id} style={nested ? styles.nestedTask : null}>
        <TaskListRow
          task={task}
          dateLabel={taskDateLabel(task, profile?.locale)}
          onPress={() => setSelectedTaskId(task.id)}
          onComplete={
            task.status === 'active'
              ? () => void completeTask(task.id, { completionSource: 'manual' })
              : undefined
          }
          onReactivate={
            task.status === 'completed' ? () => void handleReactivateTask(task) : undefined
          }
          onEdit={() => setEditingTaskId(task.id)}
          onDelete={() => confirmDeleteTask(task)}
        />
      </View>
    );
  }

  async function handleScheduleTaskEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (!scheduleTask) {
      throw new Error('Task not found.');
    }

    const conversion = await convertTaskToEvent(scheduleTask.id, input);
    if (options.publishToDevice) {
      await publishEvent(conversion.eventId, conversion.eventInput);
    }

    setScheduleTaskId(null);
    setSelectedTaskId(null);
  }

  async function handleStartNow(minutes: number, options: CreateEventOptions): Promise<void> {
    if (!startNowTask) {
      throw new Error('Task not found.');
    }

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const timezone = profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    const input: CreateEventInput = {
      title: startNowTask.title,
      description: startNowTask.description,
      startAt,
      endAt,
      timezone,
    };
    const conversion = await convertTaskToEvent(startNowTask.id, input);
    if (options.publishToDevice) {
      await publishEvent(conversion.eventId, conversion.eventInput);
    }

    setStartNowTaskId(null);
    setSelectedTaskId(null);
    navigation.navigate('Plan', {
      screen: 'FocusMode',
      params: {
        eventId: conversion.eventId,
        taskId: startNowTask.id,
        title: conversion.eventInput.title,
        description: conversion.eventInput.description,
        startAtIso: conversion.eventInput.startAt.toISOString(),
        endAtIso: conversion.eventInput.endAt.toISOString(),
        timezone: conversion.eventInput.timezone,
      },
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top },
          { paddingBottom: spacing['3xl'] + insets.bottom },
        ]}
      >
        <ScreenHeader title="Tasks" onPressBack={() => navigation.goBack()} />
        <View
          accessibilityRole="toolbar"
          accessibilityLabel="Task list controls"
          style={[styles.listControls, activeDropdown ? styles.listControlsRaised : null]}
        >
          <TaskListDropdown
            title="Status"
            accessibilityLabel="Task status"
            icon="filter"
            isOpen={activeDropdown === 'status'}
            onToggle={() =>
              setActiveDropdown((current) => (current === 'status' ? null : 'status'))
            }
            value={taskFilter}
            options={[
              { value: 'active', label: 'Active', icon: 'active', count: activeTaskCount },
              {
                value: 'completed',
                label: 'Completed',
                icon: 'completed',
                count: completedTaskCount,
              },
              { value: 'all', label: 'All tasks', icon: 'tasks', count: operationalTasks.length },
            ]}
            onSelect={(value) => {
              setTaskFilter(value as TaskFilter);
              setActiveDropdown(null);
            }}
          />
          <View pointerEvents="none" style={styles.controlDivider} />
          <TaskListDropdown
            title="Group"
            accessibilityLabel="Task grouping"
            icon="tasks"
            isOpen={activeDropdown === 'group'}
            onToggle={() => setActiveDropdown((current) => (current === 'group' ? null : 'group'))}
            value={groupBy}
            options={[
              { value: 'none', label: 'None', icon: 'tasks' },
              { value: 'goal', label: 'Goal', icon: 'goal' },
              { value: 'milestone', label: 'Milestone', icon: 'goalMilestone' },
            ]}
            onSelect={(value) => {
              setGroupBy(value as TaskGroupBy);
              setCollapsedGroups(new Set());
              setActiveDropdown(null);
            }}
          />
          <View pointerEvents="none" style={styles.controlDivider} />
          <TaskListDropdown
            title="Sort"
            accessibilityLabel="Task sorting"
            icon="date"
            isOpen={activeDropdown === 'sort'}
            onToggle={() => setActiveDropdown((current) => (current === 'sort' ? null : 'sort'))}
            value={sortBy}
            options={[
              { value: 'dueDate:asc', label: 'Due date ascending', icon: 'dateAscending' },
              { value: 'dueDate:desc', label: 'Due date descending', icon: 'dateDescending' },
              { value: 'updated:asc', label: 'Updated ascending', icon: 'updatedAscending' },
              { value: 'updated:desc', label: 'Updated descending', icon: 'updatedDescending' },
              { value: 'title:asc', label: 'Title A to Z', icon: 'textAscending' },
              { value: 'title:desc', label: 'Title Z to A', icon: 'textDescending' },
            ]}
            onSelect={(value) => {
              setSortBy(value as TaskSortBy);
              setActiveDropdown(null);
            }}
          />
        </View>

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading tasks...</Text>
            <Text style={styles.stateDescription}>Pulling in your unscheduled work list.</Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <RecoveryCard
            title="Unable to load tasks."
            description="Check your connection, then retry."
            onRetry={retry}
          />
        ) : null}

        {(uiState === 'empty' || uiState === 'ready') && visibleTasks.length === 0 ? (
          <AppCard>
            <Text style={styles.stateTitle}>
              {taskFilter === 'active'
                ? 'No active tasks.'
                : taskFilter === 'completed'
                  ? 'No completed tasks.'
                  : 'No tasks yet.'}
            </Text>
            <Text style={styles.stateDescription}>
              {taskFilter === 'active'
                ? 'Add a task to capture work before it belongs on the calendar.'
                : taskFilter === 'completed'
                  ? 'Tasks you mark complete will appear here.'
                  : 'Add a task to start building your unscheduled work list.'}
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'ready' || uiState === 'empty'
          ? groupBy === 'none'
            ? visibleTasks.map((task) => renderTaskRow(task))
            : taskGroups.map((group) => {
                const rootKey = `goal:${group.id}`;
                const rootCollapsed = collapsedGroups.has(rootKey);
                const totalCount =
                  group.tasks.length +
                  group.milestones.reduce((count, milestone) => count + milestone.tasks.length, 0);
                return (
                  <View key={rootKey} style={styles.taskGroup}>
                    <TaskHierarchyRow
                      title={group.label}
                      kind={group.kind}
                      detail={group.kind === 'goal' ? 'Goal tasks' : 'Tasks without a goal'}
                      countLabel={`${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}`}
                      expanded={!rootCollapsed}
                      accessibilityLabel={`${group.label}, ${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}`}
                      onPress={() => toggleGroup(rootKey)}
                      onToggleExpanded={() => toggleGroup(rootKey)}
                    />
                    {!rootCollapsed ? (
                      <View
                        testID={`task-group-children-${group.id}`}
                        style={[
                          styles.groupChildren,
                          groupBy === 'milestone' && group.kind === 'goal'
                            ? styles.milestoneGroupChildren
                            : null,
                        ]}
                      >
                        {group.tasks.length > 0 ? (
                          <>
                            <Text accessibilityRole="header" style={styles.groupTaskHeader}>
                              TASKS
                            </Text>
                            {group.tasks.map((task) => renderTaskRow(task, group.kind === 'goal'))}
                          </>
                        ) : null}
                        {groupBy === 'milestone'
                          ? group.milestones.map((milestone) => {
                              const milestoneKey = `milestone:${group.id}:${milestone.id}`;
                              const milestoneCollapsed = collapsedGroups.has(milestoneKey);
                              return (
                                <View key={milestoneKey}>
                                  <TaskHierarchyRow
                                    title={milestone.label}
                                    kind="milestone"
                                    nested
                                    countLabel={`${milestone.tasks.length} ${milestone.tasks.length === 1 ? 'task' : 'tasks'}`}
                                    expanded={!milestoneCollapsed}
                                    accessibilityLabel={`${milestone.label}, ${milestone.tasks.length} ${milestone.tasks.length === 1 ? 'task' : 'tasks'}`}
                                    onPress={() => toggleGroup(milestoneKey)}
                                    onToggleExpanded={() => toggleGroup(milestoneKey)}
                                  />
                                  {!milestoneCollapsed ? (
                                    <View
                                      testID={`milestone-task-children-${milestone.id}`}
                                      style={styles.milestoneTasks}
                                    >
                                      <Text
                                        accessibilityRole="header"
                                        style={styles.groupTaskHeader}
                                      >
                                        TASKS
                                      </Text>
                                      {milestone.tasks.map((task) => renderTaskRow(task, true))}
                                    </View>
                                  ) : null}
                                </View>
                              );
                            })
                          : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
          : null}
        {activeDropdown ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss task list menus"
            onPress={() => setActiveDropdown(null)}
            style={styles.menuDismissLayer}
          />
        ) : null}
      </ScrollView>

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => setAddTaskVisible(false)}
        onSave={handleCreateTask}
        goals={goals}
        goalsLoading={goalsUiState === 'loading'}
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
        onMarkComplete={handleMarkTaskComplete}
        onReactivate={handleReactivateTask}
      />
      <EditTaskModal
        visible={editingTask !== null}
        task={editingTask}
        goals={goals}
        onClose={() => setEditingTaskId(null)}
        onSave={handleUpdateTask}
      />

      <AddEventModal
        visible={scheduleTask !== null}
        modalTitle="Schedule Task"
        initialDate={new Date()}
        initialValues={
          scheduleTask
            ? {
                title: scheduleTask.title,
                description: scheduleTask.description,
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
      <ConfirmationModal
        visible={pendingDeleteTask !== null}
        title="Delete task?"
        message={
          pendingDeleteTask ? `“${pendingDeleteTask.title}” will be permanently deleted.` : ''
        }
        confirmLabel="Delete task"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete task"
        icon="delete"
        iconTone="danger"
        onCancel={() => setPendingDeleteTask(null)}
        onConfirm={() => void handleDeleteTask()}
      />
    </View>
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
    listControls: {
      position: 'relative',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
    },
    listControlsRaised: { zIndex: 20, elevation: 20 },
    controlDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    taskGroup: { gap: spacing.xs },
    groupChildren: {
      gap: spacing.xs,
      marginLeft: spacing.md,
      paddingLeft: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
    },
    milestoneGroupChildren: {
      marginLeft: 0,
      paddingLeft: 0,
      borderLeftWidth: 0,
    },
    groupTaskHeader: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    milestoneTasks: {
      gap: spacing.xs,
      marginLeft: spacing.lg,
      paddingLeft: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
    },
    nestedTask: { paddingLeft: spacing.xs },
    menuDismissLayer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
    },
  });
