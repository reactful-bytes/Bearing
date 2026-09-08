import { useState } from 'react';
import { Text } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { CreateTaskInput } from '../../features/tasks/taskTypes';

type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateTaskInput) => Promise<void>;
  initialGoalId?: string | null;
  initialStepId?: string | null;
  contextLabel?: string;
};

export function AddTaskModal({
  visible,
  onClose,
  onSave,
  initialGoalId = null,
  initialStepId = null,
  contextLabel,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm(): void {
    setTitle('');
    setDescription('');
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

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        ...(initialGoalId ? { goalId: initialGoalId } : {}),
        ...(initialStepId ? { stepId: initialStepId } : {}),
      });
      handleClose();
    } catch {
      setError('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} title="New Task" onClose={handleClose}>
      <FormField
        label="Title"
        accessibilityLabel="Task title"
        placeholder="Add the task"
        value={title}
        onChangeText={setTitle}
        error={error}
      />

      <FormField
        label="Description"
        accessibilityLabel="Task description"
        placeholder="Optional details"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {contextLabel ? <Text accessibilityLabel="Task context">{contextLabel}</Text> : null}

      <AppButton
        label="Save Task"
        accessibilityLabel="Save task"
        onPress={handleSave}
        loading={saving}
        loadingLabel="Saving..."
      />
    </AppModal>
  );
}
