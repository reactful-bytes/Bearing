import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { TaskRecord } from '../../features/tasks/taskTypes';

type StartNowModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  onClose: () => void;
  onConfirm: (minutes: number) => Promise<void>;
};

const DEFAULT_MINUTES = '30';

export function StartNowModal({ visible, task, onClose, onConfirm }: StartNowModalProps) {
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setMinutes(DEFAULT_MINUTES);
    setError(null);
    setSaving(false);
  }, [visible]);

  async function handleConfirm(): Promise<void> {
    const parsedMinutes = Number.parseInt(minutes.trim(), 10);

    if (!Number.isInteger(parsedMinutes) || parsedMinutes <= 0) {
      setError('Enter a whole number of minutes greater than zero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onConfirm(parsedMinutes);
      onClose();
    } catch {
      setError('Failed to start the task right now. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} title="Start Now" onClose={onClose}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Task</Text>
        <Text style={styles.summaryTitle}>{task?.title ?? 'Task'}</Text>
      </View>

      <View style={styles.formField}>
        <Text style={styles.label}>Minutes</Text>
        <TextInput
          accessibilityLabel="Start now minutes"
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="30"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={styles.helperText}>
          This will create an event starting immediately and open Focus Mode.
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Confirm start now"
        onPress={handleConfirm}
        disabled={saving}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !saving ? styles.buttonPressed : null,
          saving ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {saving ? 'Starting...' : 'Start Focus Session'}
        </Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  summaryTitle: {
    ...typography.button,
    color: colors.text,
  },
  formField: {
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
  helperText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
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
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
