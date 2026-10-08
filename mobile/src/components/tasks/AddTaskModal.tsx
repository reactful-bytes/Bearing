import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventDateTimePickerField } from '../calendar/EventDateTimePickerField';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { eventFormValueToDate } from '../../features/calendar/eventEditor';
import { useUserProfile } from '../../features/profile/useUserProfile';
import { CreateTaskInput } from '../../features/tasks/taskTypes';
import { GoalWithMilestones } from '../../features/goals/goalTypes';
import { TaskAssociationSelector } from './TaskAssociationSelector';

type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateTaskInput) => Promise<void>;
  initialGoalId?: string | null;
  initialMilestoneId?: string | null;
  initialTitle?: string;
  initialDescription?: string;
  contextLabel?: string;
  goals?: readonly GoalWithMilestones[];
  goalsLoading?: boolean;
  allowedDraftGoalId?: string | null;
  fullScreen?: boolean;
  embedded?: boolean;
};

export function AddTaskModal({
  visible,
  onClose,
  onSave,
  initialGoalId = null,
  initialMilestoneId = null,
  initialTitle = '',
  initialDescription = '',
  contextLabel,
  goals = [],
  goalsLoading = false,
  allowedDraftGoalId = null,
  fullScreen = true,
  embedded = false,
}: AddTaskModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [starter, setStarter] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [goalId, setGoalId] = useState(initialGoalId);
  const [milestoneId, setMilestoneId] = useState(initialMilestoneId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialTitle);
    setDescription(initialDescription);
    setGoalId(initialGoalId);
    setMilestoneId(initialMilestoneId);
  }, [initialDescription, initialGoalId, initialMilestoneId, initialTitle, visible]);

  function resetForm(): void {
    setTitle('');
    setDescription('');
    setStarter('');
    setDueDate('');
    setGoalId(initialGoalId);
    setMilestoneId(initialMilestoneId);
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

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        starter: starter.trim(),
        ...(goalId ? { goalId } : {}),
        ...(goalId && milestoneId ? { milestoneId } : {}),
        ...(dueDateValue ? { dueDate: dueDateValue } : {}),
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
      embedded={embedded}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          embedded ? { paddingHorizontal: spacing.lg } : null,
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
          label="Starter cue"
          accessibilityLabel="Task starter cue"
          placeholder="A small first action to get started"
          value={starter}
          onChangeText={setStarter}
          multiline
          labelStyle={styles.fieldLabel}
          inputStyle={styles.textArea}
        />

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

        <TaskAssociationSelector
          goals={goals}
          goalsLoading={goalsLoading}
          allowedDraftGoalId={allowedDraftGoalId}
          goalId={goalId}
          milestoneId={milestoneId}
          onChange={({ goalId: nextGoalId, milestoneId: nextMilestoneId }) => {
            setGoalId(nextGoalId);
            setMilestoneId(nextMilestoneId);
          }}
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
