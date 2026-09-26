import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskGoalLinker } from './TaskGoalLinker';
import { TaskScheduleFields } from './TaskScheduleFields';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { GoalWithTasks } from '../../features/goals/goalTypes';
import { useUserProfile } from '../../features/profile/useUserProfile';
import { taskScheduleFormValuesFromTask, parseTaskScheduleForm } from '../../features/tasks/taskScheduling';
import type { TaskScheduleFormValues } from '../../features/tasks/taskScheduling';
import type { TaskRecord, UpdateTaskInput } from '../../features/tasks/taskTypes';

type TaskEditModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  goals?: GoalWithTasks[];
  onClose: () => void;
  onSave: (taskId: string, fields: UpdateTaskInput) => Promise<void>;
};

const EMPTY_SCHEDULE: TaskScheduleFormValues = {
  scheduleVisible: false,
  dueDate: '',
  scheduledStartDate: '',
  scheduledStartTime: '',
  scheduledEndDate: '',
  scheduledEndTime: '',
  allDay: false,
};

export function TaskEditModal({
  visible,
  task,
  goals = [],
  onClose,
  onSave,
}: TaskEditModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starter, setStarter] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !task) return;
    const timezone = profile?.timezone ?? 'UTC';
    setTitle(task.title);
    setDescription(task.description);
    setStarter(task.starter);
    setSelectedGoalId(task.goalId);
    setSchedule(taskScheduleFormValuesFromTask(task, timezone));
    setSaving(false);
    setError(null);
  }, [profile?.timezone, task, visible]);

  function updateSchedule(fields: Partial<TaskScheduleFormValues>): void {
    setSchedule((current) => ({ ...current, ...fields }));
  }

  async function handleSave(): Promise<void> {
    if (!task) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    const scheduleResult = parseTaskScheduleForm(schedule, profile?.timezone ?? 'UTC');
    if (scheduleResult.error) {
      setError(scheduleResult.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(task.id, {
        title: trimmedTitle,
        description: description.trim(),
        starter: starter.trim(),
        goalId: selectedGoalId,
        ...scheduleResult.fields,
      });
      onClose();
    } catch {
      setError('Failed to save task changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} onClose={onClose} fullScreen hideHeader>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: spacing.sm + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Edit Task" onPressBack={onClose} />
        <FormField
          label="Title"
          accessibilityLabel="Edit task title"
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          error={error}
        />
        <FormField
          label="Description"
          accessibilityLabel="Edit task description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Optional details"
        />
        <FormField
          label="Starter"
          accessibilityLabel="Edit task starter"
          value={starter}
          onChangeText={setStarter}
          multiline
          placeholder="Optional first move"
        />
        <TaskGoalLinker goals={goals} value={selectedGoalId} onChange={setSelectedGoalId} />
        <TaskScheduleFields
          {...schedule}
          visible={schedule.scheduleVisible}
          onToggle={() => updateSchedule({ scheduleVisible: !schedule.scheduleVisible })}
          onDueDateChange={(value) => updateSchedule({ dueDate: value })}
          onScheduledStartDateChange={(value) => updateSchedule({ scheduledStartDate: value })}
          onScheduledStartTimeChange={(value) => updateSchedule({ scheduledStartTime: value })}
          onScheduledEndDateChange={(value) => updateSchedule({ scheduledEndDate: value })}
          onScheduledEndTimeChange={(value) => updateSchedule({ scheduledEndTime: value })}
          onAllDayChange={(value) => updateSchedule({ allDay: value })}
          timezone={profile?.timezone ?? 'UTC'}
          locale={profile?.locale}
          timeFormat={profile?.timeFormat}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <AppButton
          label="Save Changes"
          accessibilityLabel="Save task changes"
          onPress={handleSave}
          loading={saving}
          loadingLabel="Saving..."
        />
      </ScrollView>
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
  });