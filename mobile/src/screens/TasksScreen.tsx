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
import { colors, layout, radii, spacing, typography } from '../design/tokens';
import { CreateEventInput } from '../features/calendar/calendarTypes';
import { useTasks } from '../features/tasks/useTasks';
import { CreateTaskInput, TaskRecord, UpdateTaskInput } from '../features/tasks/taskTypes';
import { AppTabParamList, CalendarFocusLaunch } from '../navigation/navigationTypes';
import { getFirebaseAuth } from '../services/firebase/firebaseAuth';
import { createEvent as createFirebaseEvent } from '../services/firebase/firebaseEvents';

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
  const { tasks, uiState, createTask, updateTask, completeTask, deleteTask } = useTasks();
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
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
  const visibleTasks = useMemo(
    () => (showCompleted ? tasks : tasks.filter((task) => task.status === 'active')),
    [showCompleted, tasks],
  );

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

  async function handleScheduleTaskEvent(input: CreateEventInput): Promise<void> {
    if (!scheduleTask) {
      throw new Error('Task not found.');
    }

    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    const eventId = await createFirebaseEvent(userId, input);
    await completeTask(scheduleTask.id, {
      completionSource: 'scheduled',
      completedEventId: eventId,
    });

    setScheduleTaskId(null);
    setSelectedTaskId(null);
  }

  async function handleStartNow(minutes: number): Promise<void> {
    if (!startNowTask) {
      throw new Error('Task not found.');
    }

    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const eventId = await createFirebaseEvent(userId, {
      title: startNowTask.title,
      description: startNowTask.description,
      startAt,
      endAt,
      timezone,
    });

    await completeTask(startNowTask.id, {
      completionSource: 'start_now',
      completedEventId: eventId,
    });

    const focusLaunch: CalendarFocusLaunch = {
      token: `${eventId}-${Date.now()}`,
      eventId,
      title: startNowTask.title,
      description: startNowTask.description,
      startAtIso: startAt.toISOString(),
      endAtIso: endAt.toISOString(),
      timezone,
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
          onPress={() => setShowCompleted((current) => !current)}
          style={({ pressed }) => [styles.filterButton, pressed ? styles.filterButtonPressed : null]}
        >
          <Text style={styles.filterButtonText}>{showCompleted ? 'Hide Completed' : 'Show Completed'}</Text>
        </Pressable>

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading tasks...</Text>
            <Text style={styles.stateDescription}>Pulling in your unscheduled work list.</Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Unable to load tasks.</Text>
            <Text style={styles.stateDescription}>Check your connection and try again in a moment.</Text>
          </AppCard>
        ) : null}

        {uiState === 'empty' ? (
          <AppCard>
            <Text style={styles.stateTitle}>No tasks yet.</Text>
            <Text style={styles.stateDescription}>Add a task to capture work before it belongs on the calendar.</Text>
          </AppCard>
        ) : null}

        {uiState === 'ready' && visibleTasks.length === 0 ? (
          <AppCard>
            <Text style={styles.stateTitle}>No active tasks.</Text>
            <Text style={styles.stateDescription}>Turn on completed tasks to review items you already scheduled or finished.</Text>
          </AppCard>
        ) : null}

        {uiState === 'ready'
          ? visibleTasks.map((task) => (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityLabel={`Open task ${task.title}`}
                onPress={() => setSelectedTaskId(task.id)}
                style={({ pressed }) => [styles.taskCardPressable, pressed ? styles.taskCardPressed : null]}
              >
                <AppCard style={styles.taskCard}>
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.taskStatus}>{completionLabel(task)}</Text>
                    <Text style={styles.taskDate}>{formatDateTime(task.updatedAt)}</Text>
                  </View>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>
                    {task.description.trim() ? task.description : 'No description added.'}
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

      <AddTaskModal visible={addTaskVisible} onClose={() => setAddTaskVisible(false)} onSave={handleCreateTask} />

      <TaskDetailModal
        visible={selectedTask !== null}
        task={selectedTask}
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
        onClose={() => setScheduleTaskId(null)}
        onSave={handleScheduleTaskEvent}
      />

      <StartNowModal
        visible={startNowTask !== null}
        task={startNowTask}
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
  filterButton: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButtonPressed: {
    opacity: 0.88,
  },
  filterButtonText: {
    ...typography.button,
    color: colors.textPrimary,
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
    gap: spacing.md,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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