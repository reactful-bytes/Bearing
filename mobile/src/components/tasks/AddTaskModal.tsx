import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventDateTimePickerField } from '../calendar/EventDateTimePickerField';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { layout, radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { eventFormValueToDate } from '../../features/calendar/eventEditor';
import { useUserProfile } from '../../features/profile/useUserProfile';
import { CreateTaskInput } from '../../features/tasks/taskTypes';

type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateTaskInput) => Promise<void>;
  initialGoalId?: string | null;
  initialTitle?: string;
  initialDescription?: string;
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
  contextLabel,
  fullScreen = false,
}: AddTaskModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [starter, setStarter] = useState('');
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
  }, [initialDescription, initialTitle, visible]);

  function resetForm(): void {
    setTitle('');
    setDescription('');
    setStarter('');
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
    const dueDateValue = dueDate ? eventFormValueToDate(dueDate, '12:00', timezone) : null;
    const scheduledStart = scheduledStartDate
      ? eventFormValueToDate(
          scheduledStartDate,
          allDay ? '00:00' : scheduledStartTime || '',
          timezone,
        )
      : null;
    const scheduledEnd = scheduledEndDate
      ? eventFormValueToDate(scheduledEndDate, allDay ? '23:59' : scheduledEndTime || '', timezone)
      : null;

    if (
      scheduleVisible &&
      ((scheduledStartDate && !scheduledStart) || (scheduledEndDate && !scheduledEnd))
    ) {
      setError('Schedule dates and times must be valid.');
      return;
    }

    if (scheduledStart && !scheduledEnd) {
      setError('Add an end date and time for a scheduled task.');
      return;
    }

    if (!scheduledStart && scheduledEnd) {
      setError('Add a start date and time for a scheduled task.');
      return;
    }

    if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
      setError('Task end must be after task start.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        starter: starter.trim(),
        ...(initialGoalId ? { goalId: initialGoalId } : {}),
        ...(dueDateValue ? { dueDate: dueDateValue } : {}),
        ...(scheduledStart ? { scheduledStart } : {}),
        ...(scheduledEnd ? { scheduledEnd } : {}),
        ...(scheduleVisible ? { allDay } : {}),
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

        <AppButton
          label={scheduleVisible ? 'Hide schedule details' : 'Add schedule details'}
          variant="secondary"
          accessibilityLabel={scheduleVisible ? 'Hide schedule details' : 'Add schedule details'}
          onPress={() => setScheduleVisible((current) => !current)}
        />

        {scheduleVisible ? (
          <View style={styles.scheduleSection}>
            <EventDateTimePickerField
              label="Due date"
              accessibilityLabel="Task due date"
              mode="date"
              value={dueDate}
              dateValue={dueDate}
              timeValue="12:00"
              timezone={profile?.timezone ?? 'UTC'}
              locale={profile?.locale}
              timeFormat={profile?.timeFormat}
              allowClear
              compact
              onChange={setDueDate}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="All-day task"
              accessibilityState={{ checked: allDay }}
              onPress={() => setAllDay((current) => !current)}
              style={styles.allDayToggle}
            >
              <Text style={styles.allDayToggleText}>{allDay ? 'All day: On' : 'All day: Off'}</Text>
            </Pressable>
            <EventDateTimePickerField
              label="Schedule start date"
              accessibilityLabel="Task schedule start date"
              mode="date"
              value={scheduledStartDate}
              dateValue={scheduledStartDate}
              timeValue={scheduledStartTime}
              timezone={profile?.timezone ?? 'UTC'}
              locale={profile?.locale}
              timeFormat={profile?.timeFormat}
              allowClear
              compact
              onChange={setScheduledStartDate}
            />
            {!allDay ? (
              <EventDateTimePickerField
                label="Schedule start time"
                accessibilityLabel="Task schedule start time"
                mode="time"
                value={scheduledStartTime}
                dateValue={scheduledStartDate}
                timeValue={scheduledStartTime}
                timezone={profile?.timezone ?? 'UTC'}
                locale={profile?.locale}
                timeFormat={profile?.timeFormat}
                allowClear
                compact
                onChange={setScheduledStartTime}
              />
            ) : null}
            <EventDateTimePickerField
              label="Schedule end date"
              accessibilityLabel="Task schedule end date"
              mode="date"
              value={scheduledEndDate}
              dateValue={scheduledEndDate}
              timeValue={scheduledEndTime}
              timezone={profile?.timezone ?? 'UTC'}
              locale={profile?.locale}
              timeFormat={profile?.timeFormat}
              allowClear
              compact
              onChange={setScheduledEndDate}
            />
            {!allDay ? (
              <EventDateTimePickerField
                label="Schedule end time"
                accessibilityLabel="Task schedule end time"
                mode="time"
                value={scheduledEndTime}
                dateValue={scheduledEndDate}
                timeValue={scheduledEndTime}
                timezone={profile?.timezone ?? 'UTC'}
                locale={profile?.locale}
                timeFormat={profile?.timeFormat}
                allowClear
                compact
                onChange={setScheduledEndTime}
              />
            ) : null}
          </View>
        ) : null}

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
    scheduleSection: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    allDayToggle: {
      minHeight: layout.minimumTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
    },
    allDayToggleText: {
      ...typography.body,
      color: theme.colors.text,
    },
    contextLabel: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
  });
