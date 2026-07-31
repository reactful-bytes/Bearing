import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { TaskRecord, UpdateTaskInput } from '../../features/tasks/taskTypes';

type TaskDetailModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  onClose: () => void;
  onSave: (taskId: string, fields: UpdateTaskInput) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onSchedule: (task: TaskRecord) => void;
  onStartNow: (task: TaskRecord) => void;
  onMarkComplete: (task: TaskRecord) => Promise<void>;
};

function formatDateTime(date: Date | null): string {
  if (!date) {
    return 'Not completed';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getCompletionLabel(task: TaskRecord): string {
  if (task.status === 'active') {
    return 'Active';
  }

  if (task.completionSource === 'scheduled') {
    return 'Completed by scheduling';
  }

  if (task.completionSource === 'start_now') {
    return 'Completed by Start Now';
  }

  return 'Completed manually';
}

export function TaskDetailModal({
  visible,
  task,
  onClose,
  onSave,
  onDelete,
  onSchedule,
  onStartNow,
  onMarkComplete,
}: TaskDetailModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task || !visible) {
      return;
    }

    setEditMode(false);
    setTitle(task.title);
    setDescription(task.description);
    setSaving(false);
    setConfirmingDelete(false);
    setError(null);
  }, [task, visible]);

  function handleClose(): void {
    setEditMode(false);
    setSaving(false);
    setConfirmingDelete(false);
    setError(null);
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!task) {
      return;
    }

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
      });
      setEditMode(false);
      setConfirmingDelete(false);
    } catch {
      setError('Failed to save task changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!task) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onDelete(task.id);
      handleClose();
    } catch {
      setError('Failed to delete task.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkComplete(): Promise<void> {
    if (!task) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onMarkComplete(task);
      handleClose();
    } catch {
      setError('Failed to mark task complete.');
    } finally {
      setSaving(false);
    }
  }

  const headerAccessory = task ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={editMode ? 'Cancel task editing' : 'Edit task'}
      onPress={() => {
        setError(null);
        setConfirmingDelete(false);
        setEditMode((current) => !current);
      }}
      style={({ pressed }) => [styles.headerButton, pressed ? styles.buttonPressed : null]}
    >
      <Text style={styles.headerButtonText}>{editMode ? 'Cancel' : 'Edit'}</Text>
    </Pressable>
  ) : null;

  return (
    <AppModal
      visible={visible}
      title="Task Details"
      onClose={handleClose}
      headerAccessory={headerAccessory}
    >
      {task ? (
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.summaryCard}>
            <Text style={styles.statusLabel}>{getCompletionLabel(task)}</Text>
            <Text style={styles.summaryTitle}>{task.title}</Text>
            <Text style={styles.summaryDate}>Updated {formatDateTime(task.updatedAt)}</Text>
            {task.status === 'completed' ? (
              <Text style={styles.summaryDate}>Completed {formatDateTime(task.completedAt)}</Text>
            ) : null}
          </AppCard>

          {editMode ? (
            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  accessibilityLabel="Edit task title"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Task title"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  accessibilityLabel="Edit task description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  placeholder="Optional details"
                  style={[styles.input, styles.textArea]}
                />
              </View>
            </View>
          ) : (
            <AppCard style={styles.readOnlyCard}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDescription}>
                {task.description.trim() ? task.description : 'No description added.'}
              </Text>
            </AppCard>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {editMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save task changes"
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !saving ? styles.buttonPressed : null,
                saving ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          ) : task.status === 'active' ? (
            <View style={styles.actionStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Schedule task"
                onPress={() => onSchedule(task)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.primaryButtonText}>Schedule</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start task now"
                onPress={() => onStartNow(task)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Start Now</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark task complete"
                onPress={saving ? undefined : handleMarkComplete}
                style={({ pressed }) => [
                  styles.tertiaryButton,
                  saving ? styles.buttonDisabled : null,
                  pressed && !saving ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.tertiaryButtonText}>
                  {saving ? 'Working...' : 'Mark Complete'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!confirmingDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete task"
              onPress={() => setConfirmingDelete(true)}
              style={({ pressed }) => [styles.dangerButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.dangerButtonText}>Delete Task</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBlock}>
              <Text style={styles.confirmText}>Delete this task permanently?</Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel task delete"
                  onPress={() => setConfirmingDelete(false)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm task delete"
                  onPress={saving ? undefined : handleDelete}
                  style={({ pressed }) => [
                    styles.confirmDeleteButton,
                    saving ? styles.buttonDisabled : null,
                    pressed && !saving ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.confirmDeleteButtonText}>
                    {saving ? 'Deleting...' : 'Yes, Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  summaryCard: {
    gap: spacing.xs,
  },
  readOnlyCard: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textArea: {
    minHeight: 180,
  },
  statusLabel: {
    ...typography.label,
    color: colors.brand,
  },
  summaryTitle: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
  },
  summaryDate: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  taskTitle: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
  },
  taskDescription: {
    ...typography.body,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  headerButton: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  headerButtonText: {
    ...typography.helper,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionStack: {
    gap: spacing.md,
  },
  primaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  secondaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  tertiaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tertiaryButtonText: {
    ...typography.button,
    color: colors.text,
  },
  dangerButton: {
    borderRadius: radii.md,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dangerButtonText: {
    ...typography.button,
    color: colors.dangerText,
  },
  confirmBlock: {
    gap: spacing.md,
  },
  confirmText: {
    ...typography.body,
    color: colors.text,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmDeleteButton: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.dangerText,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  confirmDeleteButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
