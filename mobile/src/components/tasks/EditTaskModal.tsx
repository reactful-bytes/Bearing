import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { spacing, typography } from '../../design/tokens';
import { GoalWithMilestones } from '../../features/goals/goalTypes';
import { TaskRecord, UpdateTaskInput } from '../../features/tasks/taskTypes';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { TaskAssociationSelector } from './TaskAssociationSelector';

type EditTaskModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  goals: readonly GoalWithMilestones[];
  allowedDraftGoalId?: string | null;
  onClose: () => void;
  onSave: (taskId: string, fields: UpdateTaskInput) => Promise<void>;
};

export function EditTaskModal({
  visible,
  task,
  goals,
  allowedDraftGoalId = null,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starter, setStarter] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !task) return;
    setTitle(task.title);
    setDescription(task.description);
    setStarter(task.starter);
    setGoalId(task.goalId);
    setMilestoneId(task.milestoneId);
    setSaving(false);
    setError(null);
  }, [task, visible]);

  async function handleSave(): Promise<void> {
    if (!task) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(task.id, {
        title: trimmedTitle,
        description: description.trim(),
        starter: starter.trim(),
        goalId,
        milestoneId: goalId ? milestoneId : null,
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
      {task ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top, paddingBottom: spacing.xl + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title="Edit Task"
            onPressBack={onClose}
            backAccessibilityLabel="Back to task details"
          />
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
            label="Starter cue"
            accessibilityLabel="Edit task starter cue"
            value={starter}
            onChangeText={setStarter}
            multiline
            placeholder="A small first action to get started"
          />
          <TaskAssociationSelector
            goals={goals}
            allowedDraftGoalId={allowedDraftGoalId}
            goalId={goalId}
            milestoneId={milestoneId}
            onChange={({ goalId: nextGoalId, milestoneId: nextMilestoneId }) => {
              setGoalId(nextGoalId);
              setMilestoneId(nextMilestoneId);
            }}
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
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { flexGrow: 1, gap: spacing.lg },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
