import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppModal } from '../ui/AppModal';
import {
  GoalDateField,
  GoalDateParts,
  GoalDatePicker,
  MONTH_OPTIONS,
  YEAR_OPTION_COUNT,
  buildDefaultGoalDateParts,
  buildGoalDateParts,
  formatGoalDateParts,
  formatTwoDigits,
  getDayOptions,
  getGoalDateFromParts,
  isFutureDate,
} from './GoalDatePicker';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { CalendarEvent } from '../../features/calendar/calendarTypes';
import { GoalStepRecord } from '../../features/goals/goalTypes';
import { GoalStepEventsUiState } from '../../features/goals/useGoalStepEvents';

type StepDetailModalProps = {
  goalTitle: string;
  step: GoalStepRecord | null;
  visible: boolean;
  linkedEvents: CalendarEvent[];
  linkedEventsState: GoalStepEventsUiState;
  onClose: () => void;
  onSaveStep: (
    stepId: string,
    fields: {
      title: string;
      description: string;
      starter: string;
      estimatedFinishDate: Date | null;
    },
  ) => Promise<void>;
  onDeleteStep: (step: GoalStepRecord) => Promise<void>;
  onSchedule: (step: GoalStepRecord) => void;
  onToggleComplete: (step: GoalStepRecord) => Promise<void>;
};

function formatDateString(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLinkedEvent(event: CalendarEvent): string {
  return event.startAt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function StepDetailModal({
  goalTitle,
  step,
  visible,
  linkedEvents,
  linkedEventsState,
  onClose,
  onSaveStep,
  onDeleteStep,
  onSchedule,
  onToggleComplete,
}: StepDetailModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starter, setStarter] = useState('');
  const [dateParts, setDateParts] = useState<GoalDateParts>({ month: 1, day: 1, year: 2026 });
  const [activeDateField, setActiveDateField] = useState<GoalDateField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_OPTION_COUNT }, (_, index) => today.getFullYear() + index),
    [today],
  );
  const dayOptions = useMemo(
    () => getDayOptions(dateParts.month, dateParts.year),
    [dateParts.month, dateParts.year],
  );

  useEffect(() => {
    if (!step || !visible) {
      return;
    }

    setEditMode(false);
    setTitle(step.title);
    setDescription(step.description);
    setStarter(step.starter);
    setDateParts(
      step.estimatedFinishDate
        ? buildGoalDateParts(step.estimatedFinishDate)
        : buildDefaultGoalDateParts(today),
    );
    setActiveDateField(null);
    setSaving(false);
    setError(null);
  }, [step, today, visible]);

  function updateDateField(field: GoalDateField, value: number): void {
    setDateParts((current) => {
      const next = { ...current, [field]: value };
      const validDays = getDayOptions(next.month, next.year);

      if (!validDays.includes(next.day)) {
        next.day = validDays[validDays.length - 1];
      }

      return next;
    });
    setActiveDateField(null);
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!step) {
      return;
    }

    if (!title.trim()) {
      setError('Step name is required.');
      return;
    }

    const parsedDate = getGoalDateFromParts(dateParts);
    if (!isFutureDate(parsedDate, today)) {
      setError('Estimated finish date must be in the future.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSaveStep(step.id, {
        title: title.trim(),
        description: description.trim(),
        starter: starter.trim(),
        estimatedFinishDate: parsedDate,
      });
      setEditMode(false);
    } catch {
      setError('Failed to save step changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!step) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onDeleteStep(step);
      onClose();
    } catch {
      setError('Failed to delete step.');
    } finally {
      setSaving(false);
    }
  }

  const headerAccessory = step ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={editMode ? 'Cancel step editing' : 'Edit step'}
      onPress={() => {
        setError(null);
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
      title="Step Details"
      onClose={onClose}
      closeLabel="Back"
      headerAccessory={headerAccessory}
    >
      {step ? (
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.summaryCard}>
            <Text style={styles.goalLabel}>{goalTitle}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepStatus}>
              {step.status === 'completed' ? 'Completed' : 'In Progress'}
            </Text>
          </AppCard>

          {editMode ? (
            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Step name</Text>
                <TextInput
                  accessibilityLabel="Edit step name"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  accessibilityLabel="Edit step description"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, styles.textArea]}
                  multiline
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Starter</Text>
                <TextInput
                  accessibilityLabel="Edit step starter"
                  value={starter}
                  onChangeText={setStarter}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <GoalDatePicker
                  title="Estimated finish date"
                  summaryLabel={`Selected date: ${formatGoalDateParts(dateParts)}`}
                  helperText="Format: MM-DD-YYYY"
                  accessibilityPrefix="edit step target"
                  dateParts={dateParts}
                  activeField={activeDateField}
                  optionsByField={{
                    month: MONTH_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                    day: dayOptions.map((day) => ({ value: day, label: formatTwoDigits(day) })),
                    year: yearOptions.map((year) => ({ value: year, label: String(year) })),
                  }}
                  onToggleField={(field) =>
                    setActiveDateField((current) => (current === field ? null : field))
                  }
                  onSelectField={updateDateField}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save step changes"
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !saving ? styles.buttonPressed : null,
                  saving ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete step"
                onPress={handleDelete}
                disabled={saving}
                style={({ pressed }) => [
                  styles.dangerButton,
                  pressed && !saving ? styles.buttonPressed : null,
                  saving ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.dangerButtonText}>Delete Step</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.section}>
              <AppCard style={styles.summaryCard}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{step.description || 'No description yet.'}</Text>
                <Text style={styles.infoLabel}>Starter</Text>
                <Text style={styles.infoValue}>{step.starter || 'No starter added yet.'}</Text>
                <Text style={styles.infoLabel}>Estimated finish date</Text>
                <Text style={styles.infoValue}>
                  {step.estimatedFinishDate
                    ? formatDateString(step.estimatedFinishDate)
                    : 'Not set'}
                </Text>
              </AppCard>

              <View style={styles.actionColumn}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Schedule event"
                  onPress={() => onSchedule(step)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Schedule Event</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    step.status === 'completed' ? 'Mark step pending' : 'Mark step complete'
                  }
                  onPress={() => void onToggleComplete(step)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {step.status === 'completed' ? 'Mark Step Pending' : 'Mark Step Complete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Events</Text>

            {linkedEventsState === 'loading' ? (
              <AppCard style={styles.summaryCard}>
                <Text style={styles.infoValue}>Loading linked events...</Text>
              </AppCard>
            ) : null}

            {linkedEventsState === 'error' ? (
              <AppCard style={styles.summaryCard}>
                <Text style={styles.infoValue}>No Events Scheduled</Text>
              </AppCard>
            ) : null}

            {linkedEventsState === 'empty' || linkedEventsState === 'idle' ? (
              <AppCard style={styles.summaryCard}>
                <Text style={styles.infoValue}>No Events Scheduled</Text>
              </AppCard>
            ) : null}

            {linkedEventsState === 'ready'
              ? linkedEvents.map((event) => (
                  <AppCard key={event.id} style={styles.summaryCard}>
                    <Text
                      style={[styles.infoValue, event.endAt < new Date() ? styles.pastEvent : null]}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={[styles.infoLabel, event.endAt < new Date() ? styles.pastEvent : null]}
                    >
                      {formatLinkedEvent(event)}
                    </Text>
                  </AppCard>
                ))
              : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    gap: spacing.sm,
  },
  goalLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  stepTitle: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
  },
  stepStatus: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '700',
  },
  section: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  infoLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.button,
    color: colors.text,
  },
  headerButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButtonText: {
    ...typography.helper,
    color: colors.textPrimary,
    fontWeight: '700',
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  dangerButton: {
    borderRadius: radii.md,
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dangerButtonText: {
    ...typography.button,
    color: colors.dangerText,
  },
  actionColumn: {
    gap: spacing.md,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pastEvent: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
});
