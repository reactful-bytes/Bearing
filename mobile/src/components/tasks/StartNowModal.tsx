import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { TaskRecord } from '../../features/tasks/taskTypes';
import { CreateEventOptions } from '../../features/calendar/calendarTypes';

type StartNowModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  publicationCalendarTitle?: string | null;
  onClose: () => void;
  onConfirm: (minutes: number, options: CreateEventOptions) => Promise<void>;
};

const DEFAULT_MINUTES = '30';

export function StartNowModal({
  visible,
  task,
  publicationCalendarTitle,
  onClose,
  onConfirm,
}: StartNowModalProps) {
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishToDevice, setPublishToDevice] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setMinutes(DEFAULT_MINUTES);
    setError(null);
    setSaving(false);
    setPublishToDevice(false);
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
      await onConfirm(parsedMinutes, { publishToDevice });
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

      {publicationCalendarTitle ? (
        <View style={styles.switchRow}>
          <View style={styles.switchLabelGroup}>
            <Text style={styles.label}>Add to {publicationCalendarTitle}</Text>
            <Text style={styles.helperText}>Creates a linked copy in your device calendar.</Text>
          </View>
          <Switch
            value={publishToDevice}
            onValueChange={setPublishToDevice}
            trackColor={{ false: colors.border, true: colors.surfaceBrand }}
            thumbColor={publishToDevice ? colors.brand : colors.textSecondary}
            accessibilityLabel={`Add to ${publicationCalendarTitle}`}
          />
        </View>
      ) : null}

      <FormField
        label="Minutes"
        accessibilityLabel="Start now minutes"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
        placeholder="30"
        placeholderTextColor={colors.textSecondary}
        helperText="This will create an event starting immediately and open Focus Mode."
        error={error}
      />

      <AppButton
        label="Start Focus Session"
        accessibilityLabel="Confirm start now"
        onPress={handleConfirm}
        loading={saving}
        loadingLabel="Starting..."
      />
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
  switchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelGroup: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
});
