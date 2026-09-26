import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import type { GoalWithTasks } from '../../features/goals/goalTypes';
import { useUserProfile } from '../../features/profile/useUserProfile';
import { parseTaskScheduleForm } from '../../features/tasks/taskScheduling';
import { CreateTaskInput } from '../../features/tasks/taskTypes';
import { TaskGoalLinker } from './TaskGoalLinker';
import { TaskScheduleFields } from './TaskScheduleFields';

type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateTaskInput) => Promise<void>;
  initialGoalId?: string | null;
  initialTitle?: string;
  initialDescription?: string;
  goals?: GoalWithTasks[];
  contextLabel?: string;
  fullScreen?: boolean;
};

export function AddTaskModal({
  visible,
  onClose,
  onSave,
  initialGoalId = null,
  initialTitle = '',
  initialDescription = '',
  goals = [],
  contextLabel,
  fullScreen = false,
}: AddTaskModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [starter, setStarter] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(initialGoalId);
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [scheduledStartDate, setScheduledStartDate] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndDate, setScheduledEndDate] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialTitle);
    setDescription(initialDescription);
    setSelectedGoalId(initialGoalId);
  }, [initialDescription, initialGoalId, initialTitle, visible]);

  function resetForm(): void {
    setTitle('');
    setDescription('');
    setStarter('');
    setSelectedGoalId(initialGoalId);
    setScheduleVisible(false);
    setDueDate('');
    setScheduledStartDate('');
    setScheduledStartTime('');
    setScheduledEndDate('');
    setScheduledEndTime('');
    setAllDay(false);
    setError(null);
  }

  function handleClose(): void {
    resetForm();
    onClose();
  }

  async function handleSave(): Promise<void> {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    const timezone = profile?.timezone ?? 'UTC';
    const scheduleResult = parseTaskScheduleForm(
      {
        scheduleVisible,
        dueDate,
        scheduledStartDate,
        scheduledStartTime,
        scheduledEndDate,
        scheduledEndTime,
        allDay,
      },
      timezone,
    );
    if (scheduleResult.error) {
      setError(scheduleResult.error);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        starter: starter.trim(),
        ...(selectedGoalId ? { goalId: selectedGoalId } : {}),
        ...(scheduleVisible ? scheduleResult.fields : {}),
      });
      handleClose();
    } catch {
      setError('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      visible={visible}
      title="New Task"
      onClose={handleClose}
      fullScreen={fullScreen}
      hideHeader={fullScreen}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          fullScreen ? { paddingTop: insets.top, paddingBottom: spacing.sm + insets.bottom } : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {fullScreen ? <ScreenHeader title="New Task" onPressBack={handleClose} /> : null}
        <FormField
          label="Title"
          accessibilityLabel="Task title"
          placeholder="Add the task"
          value={title}
          onChangeText={setTitle}
          error={error}
          labelStyle={styles.fieldLabel}
          inputStyle={styles.input}
        />

        <FormField
          label="Description"
          accessibilityLabel="Task description"
          placeholder="Optional details"
          value={description}
          onChangeText={setDescription}
          multiline
          labelStyle={styles.fieldLabel}
          inputStyle={styles.textArea}
        />

        <FormField
          label="Starter"
          accessibilityLabel="Task starter"
          placeholder="Optional first move"
          value={starter}
          onChangeText={setStarter}
          multiline
        />

        <TaskGoalLinker goals={goals} value={selectedGoalId} onChange={setSelectedGoalId} />

        <TaskScheduleFields
          visible={scheduleVisible}
          onToggle={() => setScheduleVisible((current) => !current)}
          dueDate={dueDate}
          scheduledStartDate={scheduledStartDate}
          scheduledStartTime={scheduledStartTime}
          scheduledEndDate={scheduledEndDate}
          scheduledEndTime={scheduledEndTime}
          allDay={allDay}
          onDueDateChange={setDueDate}
          onScheduledStartDateChange={setScheduledStartDate}
          onScheduledStartTimeChange={setScheduledStartTime}
          onScheduledEndDateChange={setScheduledEndDate}
          onScheduledEndTimeChange={setScheduledEndTime}
          onAllDayChange={setAllDay}
          timezone={profile?.timezone ?? 'UTC'}
          locale={profile?.locale}
          timeFormat={profile?.timeFormat}
        />

        {contextLabel ? (
          <Text accessibilityLabel="Task context" style={styles.contextLabel}>
            {contextLabel}
          </Text>
        ) : null}

        <AppButton
          label="Save Task"
          accessibilityLabel="Save task"
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
    scrollView: {
      flexShrink: 1,
    },
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.sm,
    },
    fieldLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 40,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
    },
    textArea: {
      minHeight: 76,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
    },
    contextLabel: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
  });
