import { useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { AppCard } from '../components/ui/AppCard';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { colors, layout, radii, spacing, typography } from '../design/tokens';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useTasks } from '../features/tasks/useTasks';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import { AppTabParamList, CalendarFocusLaunch } from '../navigation/navigationTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, TimeFormat, timeFormatOptions } from '../features/profile/timeFormat';

type TaskFilter = 'active' | 'completed' | 'all';

function formatDateTime(date: Date, timeFormat: TimeFormat, locale?: string): string {
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(timeFormat),
  });
}

function completionLabel(task: TaskRecord): string {
  if (task.status === 'active') {
    return 'Active';
  }

  if (task.completionSource === 'scheduled') {
    return 'Scheduled';
  }

  if (task.completionSource === 'start_now') {
    return 'Started Now';
  }

  return 'Completed';
}

export function TasksScreen() {
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const { profile } = useUserProfile();
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;
  const { publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const {
    tasks,
    uiState,
    createTask,
    updateTask,
    completeTask,
    convertTaskToEvent,
    deleteTask,
    retry,
  } = useTasks();
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('active');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [startNowTaskId, setStartNowTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const scheduleTask = useMemo(
    () => tasks.find((task) => task.id === scheduleTaskId) ?? null,
    [scheduleTaskId, tasks],
  );
  const startNowTask = useMemo(
    () => tasks.find((task) => task.id === startNowTaskId) ?? null,
    [startNowTaskId, tasks],
  );
  const activeTaskCount = useMemo(
    () => tasks.filter((task) => task.status === 'active').length,
    [tasks],
  );
  const completedTaskCount = tasks.length - activeTaskCount;
  const taskFilterOptions = useMemo(
    () => [
      { value: 'active' as const, label: 'Active', count: activeTaskCount },
      { value: 'completed' as const, label: 'Completed', count: completedTaskCount },
      { value: 'all' as const, label: 'All', count: tasks.length },
    ],
    [activeTaskCount, completedTaskCount, tasks.length],
  );
  const visibleTasks = useMemo(() => {
    if (taskFilter === 'all') {
      return tasks;
    }

    return tasks.filter((task) => task.status === taskFilter);
  }, [taskFilter, tasks]);

  async function handleCreateTask(input: CreateTaskInput): Promise<void> {
    await createTask(input);
  }

  async function handleUpdateTask(taskId: string, fields: UpdateTaskInput): Promise<void> {
    await updateTask(taskId, fields);
  }

  async function handleDeleteTask(taskId: string): Promise<void> {
    await deleteTask(taskId);
    setSelectedTaskId((current) => (current === taskId ? null : current));
    setScheduleTaskId((current) => (current === taskId ? null : current));
    setStartNowTaskId((current) => (current === taskId ? null : current));
  }

  async function handleMarkTaskComplete(task: TaskRecord): Promise<void> {
    await completeTask(task.id, {
      completionSource: 'manual',
    });
    setSelectedTaskId(null);
  }

  async function handleScheduleTaskEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (!scheduleTask) {
      throw new Error('Task not found.');
    }

    const conversion = await convertTaskToEvent(scheduleTask.id, input, 'scheduled');
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
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const input: CreateEventInput = {
      title: startNowTask.title,
      description: startNowTask.description,
      startAt,
      endAt,
      timezone,
    };
    const conversion = await convertTaskToEvent(startNowTask.id, input, 'start_now');
    if (options.publishToDevice) {
      await publishEvent(conversion.eventId, conversion.eventInput);
    }

    const focusLaunch: CalendarFocusLaunch = {
      token: `${conversion.eventId}-${Date.now()}`,
      eventId: conversion.eventId,
      title: conversion.eventInput.title,
      description: conversion.eventInput.description,
      startAtIso: conversion.eventInput.startAt.toISOString(),
      endAtIso: conversion.eventInput.endAt.toISOString(),
      timezone: conversion.eventInput.timezone,
    };

    setStartNowTaskId(null);
    setSelectedTaskId(null);
    navigation.navigate('Calendar', { focusLaunch });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ScreenHeader
          eyebrow="Tasks"
          title="Tasks"
          description="Keep unscheduled work in one list, then either schedule it or start a focused session immediately."
        />

        <SegmentedControl
          accessibilityLabel="Task filter"
          options={taskFilterOptions}
          value={taskFilter}
          onChange={setTaskFilter}
        />

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
                  ? 'Tasks you finish, schedule, or start now will appear here.'
                  : 'Add a task to start building your unscheduled work list.'}
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'ready' || uiState === 'empty'
          ? visibleTasks.map((task) => (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityLabel={`Open task ${task.title}`}
                onPress={() => setSelectedTaskId(task.id)}
                style={({ pressed }) => [
                  styles.taskCardPressable,
                  pressed ? styles.taskCardPressed : null,
                ]}
              >
                <AppCard style={styles.taskCard}>
                  <View style={styles.taskHeaderRow}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskStatus}>{completionLabel(task)}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.taskDescription}>
                    {task.description.trim() ? task.description : 'No description added.'}
                  </Text>
                  <Text style={styles.taskDate}>
                    Updated {formatDateTime(task.updatedAt, timeFormat, profile?.locale)}
                  </Text>
                </AppCard>
              </Pressable>
            ))
          : null}
      </ScrollView>

      <View style={styles.fabContainer}>
        <FloatingActionButton
          accessibilityLabel="New task"
          onPress={() => setAddTaskVisible(true)}
          style={styles.smallFab}
        />
      </View>

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => setAddTaskVisible(false)}
        onSave={handleCreateTask}
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
        onMarkComplete={handleMarkTaskComplete}
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
  taskCardPressable: {
    borderRadius: radii.lg,
  },
  taskCardPressed: {
    opacity: 0.92,
  },
  taskCard: {
    gap: spacing.sm,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  taskStatus: {
    ...typography.label,
    color: colors.brand,
  },
  taskDate: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  taskTitle: {
    ...typography.button,
    color: colors.text,
    flex: 1,
  },
  taskDescription: {
    ...typography.body,
    color: colors.textPrimary,
  },
  fabContainer: {
    position: 'absolute',
    right: layout.pagePaddingHorizontal,
    bottom: layout.pagePaddingVertical,
  },
  smallFab: {
    alignSelf: 'flex-end',
    width: 56,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 28,
  },
});
