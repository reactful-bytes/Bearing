import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
            trackColor={{ false: theme.colors.border, true: theme.colors.surfaceBrand }}
            thumbColor={publishToDevice ? theme.colors.brand : theme.colors.textSecondary}
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
        placeholderTextColor={theme.colors.textSecondary}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    summaryCard: {
      gap: spacing.xs,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
      padding: spacing.lg,
    },
    summaryLabel: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    summaryTitle: {
      ...typography.button,
      color: theme.colors.text,
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
      color: theme.colors.textSecondary,
    },
    helperText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
  });
