import { useEffect, useMemo, useState } from 'react';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { TaskFilterModal } from '../components/tasks/TaskFilterModal';
import type { TaskDueDateFilter, TaskFilterDraft } from '../components/tasks/TaskFilterModal';
import { TaskHierarchyRow } from '../components/tasks/TaskHierarchyRow';
import { TaskListRow } from '../components/tasks/TaskListRow';
import { AppCard } from '../components/ui/AppCard';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { IconButton } from '../components/ui/IconButton';
import { AppIcon } from '../components/ui/AppIcon';
import { FilterSortToolbar } from '../components/ui/FilterSortToolbar';
import { SortOptionsModal } from '../components/ui/SortOptionsModal';
import { layout, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useTasks } from '../features/tasks/useTasks';
import { useGoals } from '../features/goals/useGoals';
import type { GoalWithMilestones } from '../features/goals/goalTypes';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import {
  AppTabParamList,
  PlanStackParamList,
  TaskFilter,
  TaskGroupBy,
  TaskSortBy,
} from '../navigation/navigationTypes';
import { TASK_SORT_OPTIONS } from './taskViewOptions';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';

type TaskPageSize = 10 | 15 | 25;
type TasksNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<PlanStackParamList, 'Tasks'>,
  BottomTabNavigationProp<AppTabParamList, 'Plan'>
>;
type TaskGroup = {
  id: string;
  label: string;
  kind: 'goal' | 'unlinked';
  tasks: TaskRecord[];
};

function taskDateLabel(task: TaskRecord, locale?: string): string {
  const date = task.dueDate ?? task.scheduledStart;
  if (!date) return 'No due date';
  const formatted = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
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

function filterTasksByDueDate(
  tasks: TaskRecord[],
  filter: TaskDueDateFilter,
  now = new Date(),
): TaskRecord[] {
  if (filter === 'any') return tasks;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'pastDue') {
    return tasks.filter(
      (task) => task.status !== 'completed' && task.dueDate !== null && task.dueDate < todayStart,
    );
  }

  const rangeStart =
    filter === 'thisWeek'
      ? new Date(
          todayStart.getFullYear(),
          todayStart.getMonth(),
          todayStart.getDate() - ((todayStart.getDay() + 6) % 7),
        )
      : new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const rangeEnd =
    filter === 'thisWeek'
      ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + 7)
      : new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1);

  return tasks.filter(
    (task) => task.dueDate !== null && task.dueDate >= rangeStart && task.dueDate < rangeEnd,
  );
}

function filterTasksForSearch(
  tasks: TaskRecord[],
  query: string,
  groupBy: TaskGroupBy,
  goals: GoalWithMilestones[],
): TaskRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return tasks;

  const matchingGoalIds = new Set(
    goals
      .filter((goal) => goal.title.toLocaleLowerCase().includes(normalizedQuery))
      .map((goal) => goal.id),
  );
  return tasks.filter((task) => {
    if (task.title.toLocaleLowerCase().includes(normalizedQuery)) return true;
    return groupBy === 'goal' && task.goalId !== null && matchingGoalIds.has(task.goalId);
  });
}

type TasksScreenProps = {
  route?: { params?: PlanStackParamList['Tasks'] };
  navigation?: { setParams: (params: PlanStackParamList['Tasks']) => void };
};

export function TasksScreen({ route, navigation: stackNavigation }: TasksScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TasksNavigation>();
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
  const [groupBy, setGroupBy] = useState<TaskGroupBy>('unlinked');
  const [dueDateFilter, setDueDateFilter] = useState<TaskDueDateFilter>('any');
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate:asc');
  const [taskSearch, setTaskSearch] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState<TaskPageSize>(15);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageNumberInput, setPageNumberInput] = useState('1');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);
  const createTaskParam = route?.params?.createTask;

  useEffect(() => {
    if (!createTaskParam) {
      return;
    }

    setAddTaskVisible(true);
    stackNavigation?.setParams({ createTask: undefined });
  }, [createTaskParam, stackNavigation]);

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
  const searchMatchedTasks = useMemo(
    () =>
      filterTasksForSearch(
        groupBy === 'unlinked'
          ? operationalTasks.filter((task) => task.goalId === null)
          : operationalTasks,
        taskSearch,
        groupBy,
        goals,
      ),
    [goals, groupBy, operationalTasks, taskSearch],
  );
  const selectedSort = TASK_SORT_OPTIONS.find((option) => option.value === sortBy)!;
  const taskFilterSummary = [
    taskFilter === 'all' ? 'All tasks' : taskFilter === 'active' ? 'Active' : 'Completed',
    groupBy === 'goal' ? 'Goal' : groupBy === 'unlinked' ? 'Unlinked' : 'All',
    dueDateFilter === 'any'
      ? null
      : dueDateFilter === 'pastDue'
        ? 'Past due'
        : dueDateFilter === 'thisWeek'
          ? 'This week'
          : 'This month',
  ]
    .filter(Boolean)
    .join(' · ');
  const emptyStateIsFiltered =
    Boolean(taskSearch.trim()) || dueDateFilter !== 'any' || groupBy !== 'unlinked';
  const emptyStateTitle = emptyStateIsFiltered
    ? 'No matching tasks.'
    : taskFilter === 'active'
      ? 'No active tasks.'
      : taskFilter === 'completed'
        ? 'No completed tasks.'
        : groupBy === 'unlinked'
          ? 'No unlinked tasks.'
          : 'No tasks yet.';
  const emptyStateDescription = emptyStateIsFiltered
    ? 'Try a different search or adjust the task filters.'
    : taskFilter === 'active'
      ? 'Add a task to capture work before it belongs on the calendar.'
      : taskFilter === 'completed'
        ? 'Tasks you mark complete will appear here.'
        : groupBy === 'unlinked'
          ? 'Tasks without a linked goal will appear here.'
          : 'Add a task to start building your unscheduled work list.';
  const visibleTasks = useMemo(() => {
    const filtered =
      taskFilter === 'all'
        ? searchMatchedTasks
        : searchMatchedTasks.filter((task) => task.status === taskFilter);
    return [...filterTasksByDueDate(filtered, dueDateFilter)].sort((left, right) =>
      compareTasks(left, right, sortBy),
    );
  }, [dueDateFilter, searchMatchedTasks, sortBy, taskFilter]);
  const taskGroups = useMemo(() => {
    if (groupBy !== 'goal') return [];
    const groups = new Map<string, TaskGroup>();
    for (const task of visibleTasks) {
      const goal = task.goalId ? goals.find((candidate) => candidate.id === task.goalId) : null;
      const id = task.goalId ?? 'unlinked';
      const group = groups.get(id) ?? {
        id,
        label: goal?.title ?? (task.goalId ? 'Linked goal unavailable' : 'Unlinked tasks'),
        kind: task.goalId ? ('goal' as const) : ('unlinked' as const),
        tasks: [],
      };
      group.tasks.push(task);
      groups.set(id, group);
    }
    return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [goals, groupBy, visibleTasks]);
  const pageCount = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const currentPage = Math.min(pageNumber, pageCount);
  const pageTasks = visibleTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (pageNumber !== currentPage) setPageNumber(currentPage);
    setPageNumberInput(String(currentPage));
  }, [currentPage, pageNumber]);

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

  function setAllGroupsExpanded(expanded: boolean): void {
    if (expanded) {
      setCollapsedGroups(new Set());
      return;
    }

    setCollapsedGroups(
      new Set(
        taskGroups.flatMap((group) => [
          `goal:${group.id}`,
        ]),
      ),
    );
  }

  function selectPage(page: number): void {
    const nextPage = Math.max(1, Math.min(page, pageCount));
    setPageNumber(nextPage);
    setPageNumberInput(String(nextPage));
  }

  function commitPageInput(): void {
    const requestedPage = Number.parseInt(pageNumberInput, 10);
    selectPage(Number.isNaN(requestedPage) ? currentPage : requestedPage);
  }

  function renderTaskRow(task: TaskRecord) {
    return (
      <View key={task.id}>
        <TaskListRow
          task={task}
          dateLabel={taskDateLabel(task, profile?.locale)}
          onPress={() => setSelectedTaskId(task.id)}
          onComplete={
            task.status === 'active'
              ? () => completeTask(task.id, { completionSource: 'manual' })
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
        <View style={styles.taskSearchField}>
          <AppIcon name="search" size={18} color={styles.searchIcon.color} decorative />
          <TextInput
            accessibilityLabel="Search tasks by name or title"
            autoCapitalize="none"
            onChangeText={(value) => {
              setTaskSearch(value);
              selectPage(1);
            }}
            placeholder="Search tasks"
            placeholderTextColor={styles.searchPlaceholder.color}
            returnKeyType="search"
            style={styles.taskSearchInput}
            value={taskSearch}
          />
          {taskSearch.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear task search"
              onPress={() => setTaskSearch('')}
              style={styles.clearTaskSearch}
            >
              <AppIcon name="close" size={16} color={styles.searchIcon.color} decorative />
            </Pressable>
          ) : null}
        </View>
        <FilterSortToolbar
          testID="task-filter-sort-toolbar"
          filterSummary={taskFilterSummary}
          sortSummary={selectedSort.summary}
          filterAccessibilityLabel="Filter tasks"
          sortAccessibilityLabel="Sort tasks"
          onPressFilter={() => setFilterModalVisible(true)}
          onPressSort={() => setSortModalVisible(true)}
        />
        {groupBy === 'goal' && taskGroups.length > 0 ? (
          <View style={styles.hierarchyActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expand all groups"
              onPress={() => setAllGroupsExpanded(true)}
              style={({ pressed }) => [styles.hierarchyAction, pressed ? styles.pressed : null]}
            >
              <AppIcon name="expand" size={16} color={styles.viewControlsIcon.color} decorative />
              <Text style={styles.hierarchyActionText}>Expand all</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Collapse all groups"
              onPress={() => setAllGroupsExpanded(false)}
              style={({ pressed }) => [styles.hierarchyAction, pressed ? styles.pressed : null]}
            >
              <AppIcon name="collapse" size={16} color={styles.viewControlsIcon.color} decorative />
              <Text style={styles.hierarchyActionText}>Collapse all</Text>
            </Pressable>
          </View>
        ) : null}

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
          <EmptyState
            icon="tasks"
            presentation="horizontal"
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        ) : null}

        {uiState === 'ready' || uiState === 'empty' ? (
          groupBy !== 'goal' ? (
            <View testID="flat-task-list" style={styles.flatTaskList}>
              {pageTasks.map((task) => renderTaskRow(task))}
            </View>
          ) : (
            taskGroups.map((group) => {
              const rootKey = `goal:${group.id}`;
              const rootCollapsed = collapsedGroups.has(rootKey);
              const totalCount = group.tasks.length;
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
                      ]}
                    >
                      {group.tasks.length > 0 ? (
                        <>
                          {group.kind !== 'unlinked' ? (
                            <Text accessibilityRole="header" style={styles.groupTaskHeader}>
                              TASKS
                            </Text>
                          ) : null}
                          {group.tasks.map((task) => renderTaskRow(task))}
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )
        ) : null}
        {groupBy !== 'goal' && visibleTasks.length > 0 ? (
          <View style={styles.pagination}>
            <Text style={styles.paginationSummary}>
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, visibleTasks.length)} of {visibleTasks.length}
            </Text>
            <View style={styles.pageNavigation}>
              <IconButton
                name="back"
                accessibilityLabel="Previous page"
                disabled={currentPage === 1}
                onPress={() => selectPage(currentPage - 1)}
              />
              <TextInput
                accessibilityLabel="Page number"
                keyboardType="number-pad"
                returnKeyType="done"
                value={pageNumberInput}
                onChangeText={(value) => setPageNumberInput(value.replace(/\D/g, ''))}
                onEndEditing={commitPageInput}
                style={styles.pageNumberInput}
              />
              <Text style={styles.pageCount}>of {pageCount}</Text>
              <IconButton
                name="forward"
                accessibilityLabel="Next page"
                disabled={currentPage === pageCount}
                onPress={() => selectPage(currentPage + 1)}
              />
            </View>
            <View style={styles.pageSizeSelector}>
              <Text style={styles.pageSizeLabel}>Tasks per page</Text>
              {([10, 15, 25] as const).map((size) => (
                <Pressable
                  key={size}
                  accessibilityRole="button"
                  accessibilityLabel={`${size} tasks per page`}
                  accessibilityState={{ selected: pageSize === size }}
                  onPress={() => {
                    setPageSize(size);
                    selectPage(1);
                  }}
                  style={[
                    styles.pageSizeOption,
                    pageSize === size ? styles.pageSizeOptionSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.pageSizeOptionText,
                      pageSize === size ? styles.pageSizeOptionTextSelected : null,
                    ]}
                  >
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
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
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete task"
        icon="delete"
        iconTone="danger"
        onCancel={() => setPendingDeleteTask(null)}
        onConfirm={() => void handleDeleteTask()}
      />
      <TaskFilterModal
        visible={filterModalVisible}
        draft={{ taskFilter, groupBy, dueDateFilter }}
        onClose={() => setFilterModalVisible(false)}
        onApply={(draft: TaskFilterDraft) => {
          setTaskFilter(draft.taskFilter);
          setGroupBy(draft.groupBy);
          setDueDateFilter(draft.dueDateFilter);
          setCollapsedGroups(new Set());
          selectPage(1);
          setFilterModalVisible(false);
        }}
      />
      <SortOptionsModal
        visible={sortModalVisible}
        title="Sort tasks"
        accessibilityLabelPrefix="Sort tasks by"
        selectedValue={sortBy}
        options={TASK_SORT_OPTIONS}
        onClose={() => setSortModalVisible(false)}
        onApply={(value) => {
          setSortBy(value);
          selectPage(1);
          setSortModalVisible(false);
        }}
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
    viewControlsIcon: { color: theme.colors.brand },
    taskSearchField: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      paddingLeft: spacing.md,
    },
    searchIcon: { color: theme.colors.textSecondary },
    searchPlaceholder: { color: theme.colors.textSecondary },
    taskSearchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      color: theme.colors.text,
      ...typography.helper,
    },
    clearTaskSearch: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hierarchyActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    hierarchyAction: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.sm,
      paddingHorizontal: spacing.sm,
    },
    hierarchyActionText: {
      ...typography.caption,
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    flatTaskList: { gap: spacing.xs },
    pressed: { opacity: 0.72 },
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
      marginLeft: spacing['2xl'],
      paddingLeft: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
    },
    nestedTask: { paddingLeft: spacing.xs },
    pagination: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
    paginationSummary: { ...typography.caption, color: theme.colors.textSecondary },
    pageNavigation: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    pageNumberInput: {
      width: 52,
      height: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.sm,
      color: theme.colors.text,
      textAlign: 'center',
      ...typography.helper,
    },
    pageCount: { ...typography.helper, color: theme.colors.textSecondary },
    pageSizeSelector: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    pageSizeLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginRight: spacing.xs,
    },
    pageSizeOption: {
      minWidth: 38,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.sm,
      paddingHorizontal: spacing.sm,
    },
    pageSizeOptionSelected: { backgroundColor: theme.colors.surfaceBrand },
    pageSizeOptionText: { ...typography.caption, color: theme.colors.textSecondary },
    pageSizeOptionTextSelected: { color: theme.colors.brand, fontWeight: '700' },
  });
