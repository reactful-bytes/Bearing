import { useState } from 'react';
import { NavigationProp } from '@react-navigation/native';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { StartNowModal } from '../components/tasks/StartNowModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { AppCard } from '../components/ui/AppCard';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { EmptyState } from '../components/ui/EmptyState';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { CreateEventInput, CreateEventOptions } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';
import { PlanStackParamList } from '../navigation/navigationTypes';

type TaskDetailScreenProps = {
  route: { params: PlanStackParamList['TaskDetail'] };
  navigation: NavigationProp<PlanStackParamList, 'TaskDetail'>;
};

export function TaskDetailScreen({ route, navigation }: TaskDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { profile } = useUserProfile();
  const { goals } = useGoals();
  const {
    tasks,
    uiState,
    retry,
    updateTask,
    completeTask,
    reactivateTask,
    convertTaskToEvent,
    deleteTask,
  } = useTasks();
  const { publicationCalendarTitle, publishEvent } = useCalendarPublication();
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [startingNow, setStartingNow] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null);
  const task = tasks.find((candidate) => candidate.id === route.params.taskId) ?? null;
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;

  async function handleUpdateTask(taskId: string, fields: UpdateTaskInput): Promise<void> {
    await updateTask(taskId, fields);
  }

  async function handleDeleteTask(): Promise<void> {
    if (!pendingDeleteTask) return;
    try {
      await deleteTask(pendingDeleteTask.id);
      setPendingDeleteTask(null);
      navigation.goBack();
    } catch {
      Alert.alert('Unable to delete task', 'Please try again.');
    }
  }

  async function handleScheduleTaskEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    if (!task) throw new Error('Task not found.');
    const conversion = await convertTaskToEvent(task.id, input);
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setScheduling(false);
  }

  async function handleStartNow(minutes: number, options: CreateEventOptions): Promise<void> {
    if (!task) throw new Error('Task not found.');
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const input: CreateEventInput = {
      title: task.title,
      description: task.description,
      startAt,
      endAt,
      timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      goalId: task.goalId,
      milestoneId: task.milestoneId,
    };
    const conversion = await convertTaskToEvent(task.id, input);
    if (options.publishToDevice) await publishEvent(conversion.eventId, conversion.eventInput);
    setStartingNow(false);
    navigation.navigate('FocusMode', {
      eventId: conversion.eventId,
      taskId: task.id,
      title: conversion.eventInput.title,
      description: conversion.eventInput.description,
      startAtIso: conversion.eventInput.startAt.toISOString(),
      endAtIso: conversion.eventInput.endAt.toISOString(),
      timezone: conversion.eventInput.timezone,
    });
  }

  const showTaskDetails = task !== null && !editing && !scheduling && !startingNow;

  if (uiState === 'loading') {
    return (
      <View style={[styles.screen, styles.stateScreen]}>
        <ScreenHeader title="Task Details" onPressBack={navigation.goBack} backAccessibilityLabel="Back to Plan" />
        <AppCard>
          <Text style={styles.stateText}>Loading task...</Text>
        </AppCard>
      </View>
    );
  }

  if (uiState === 'error') {
    return (
      <View style={[styles.screen, styles.stateScreen]}>
        <ScreenHeader title="Task Details" onPressBack={navigation.goBack} backAccessibilityLabel="Back to Plan" />
        <RecoveryCard
          title="Unable to load task."
          description="Check your connection, then retry."
          onRetry={retry}
        />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.screen, styles.stateScreen]}>
        <ScreenHeader title="Task Details" onPressBack={navigation.goBack} backAccessibilityLabel="Back to Plan" />
        <EmptyState
          title="Task unavailable"
          description="This task may have been removed."
          presentation="compact"
        />
      </View>
    );
  }

  return (
    <View testID="task-detail-screen" style={styles.screen}>
      {showTaskDetails ? (
        <TaskDetailsModal
          visible
          embedded
          task={task}
          goals={goals}
          locale={profile?.locale}
          timeFormat={timeFormat}
          backAccessibilityLabel="Back to Plan"
          onClose={navigation.goBack}
          onEdit={() => setEditing(true)}
          onDelete={setPendingDeleteTask}
          onSchedule={() => setScheduling(true)}
          onStartNow={() => setStartingNow(true)}
          onMarkComplete={(selectedTask) =>
            completeTask(selectedTask.id, { completionSource: 'manual' })
          }
          onReactivate={(selectedTask) => reactivateTask(selectedTask.id)}
        />
      ) : null}
      <EditTaskModal
        visible={editing}
        task={task}
        goals={goals}
        onClose={() => setEditing(false)}
        onSave={handleUpdateTask}
      />
      <AddEventModal
        visible={scheduling}
        modalTitle="Schedule Task"
        initialDate={task.dueDate ?? new Date()}
        initialValues={{ title: task.title, description: task.description }}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={timeFormat}
        fullScreen
        onClose={() => setScheduling(false)}
        onSave={handleScheduleTaskEvent}
      />
      <StartNowModal
        visible={startingNow}
        task={task}
        publicationCalendarTitle={publicationCalendarTitle}
        fullScreen
        onClose={() => setStartingNow(false)}
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
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    stateScreen: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingTop: theme.spacing.sm,
    },
    stateText: {
      color: theme.colors.textSecondary,
    },
  });
