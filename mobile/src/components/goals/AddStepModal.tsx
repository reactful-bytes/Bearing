import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { CreateGoalStepInput } from '../../features/goals/goalTypes';

type AddStepModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalStepInput) => Promise<void>;
};

type GoalDateField = 'month' | 'day' | 'year';
type GoalDateParts = {
  month: number;
  day: number;
  year: number;
};

const MONTH_OPTIONS = [
  { value: 1, label: '01 - Jan' },
  { value: 2, label: '02 - Feb' },
  { value: 3, label: '03 - Mar' },
  { value: 4, label: '04 - Apr' },
  { value: 5, label: '05 - May' },
  { value: 6, label: '06 - Jun' },
  { value: 7, label: '07 - Jul' },
  { value: 8, label: '08 - Aug' },
  { value: 9, label: '09 - Sep' },
  { value: 10, label: '10 - Oct' },
  { value: 11, label: '11 - Nov' },
  { value: 12, label: '12 - Dec' },
] as const;

const YEAR_OPTION_COUNT = 51;

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildDefaultGoalDateParts(baseDate: Date): GoalDateParts {
  const tomorrow = addDays(baseDate, 1);
  return {
    month: tomorrow.getMonth() + 1,
    day: tomorrow.getDate(),
    year: tomorrow.getFullYear(),
  };
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function formatGoalDateParts(parts: GoalDateParts): string {
  return `${formatTwoDigits(parts.month)}-${formatTwoDigits(parts.day)}-${parts.year}`;
}

function getGoalDateFromParts(parts: GoalDateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day);
}

function getDayOptions(month: number, year: number): number[] {
  const maxDay = new Date(year, month, 0).getDate();
  return Array.from({ length: maxDay }, (_, index) => index + 1);
}

function isFutureDate(date: Date, today: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dateOnly.getTime() > todayOnly.getTime();
}

export function AddStepModal({ visible, onClose, onSave }: AddStepModalProps) {
  const today = useMemo(() => new Date(), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starter, setStarter] = useState('');
  const [dateParts, setDateParts] = useState<GoalDateParts>(() => buildDefaultGoalDateParts(today));
  const [activeDateField, setActiveDateField] = useState<GoalDateField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_OPTION_COUNT }, (_, index) => today.getFullYear() + index),
    [today],
  );
  const dayOptions = useMemo(
    () => getDayOptions(dateParts.month, dateParts.year),
    [dateParts.month, dateParts.year],
  );

  function resetForm(): void {
    setTitle('');
    setDescription('');
    setStarter('');
    setDateParts(buildDefaultGoalDateParts(today));
    setActiveDateField(null);
    setSaving(false);
    setError(null);
  }

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

  function handleClose(): void {
    resetForm();
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setError('Step title is required.');
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
      await onSave({
        title: title.trim(),
        description: description.trim(),
        starter: starter.trim(),
        estimatedFinishDate: parsedDate,
      });
      handleClose();
    } catch {
      setError('Failed to save step. Please try again.');
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} title="Add Step" onClose={handleClose}>
      <FormField
        label="Step name"
        accessibilityLabel="Step name"
        value={title}
        onChangeText={setTitle}
        placeholder="Add the next action"
        placeholderTextColor={colors.textSecondary}
      />

      <FormField
        label="Description"
        accessibilityLabel="Step description"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Optional details"
        placeholderTextColor={colors.textSecondary}
      />

      <FormField
        label="Starter"
        accessibilityLabel="Step starter"
        value={starter}
        onChangeText={setStarter}
        placeholder="Optional starter cue"
        placeholderTextColor={colors.textSecondary}
      />

      <View style={styles.section}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Estimated finish date</Text>
          <Text style={styles.dateSummary}>Selected date: {formatGoalDateParts(dateParts)}</Text>
          <Text style={styles.dateHint}>Format: MM-DD-YYYY</Text>
        </View>

        <View style={styles.dateFieldRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open step target month dropdown"
            onPress={() => setActiveDateField((current) => (current === 'month' ? null : 'month'))}
            style={({ pressed }) => [
              styles.dateFieldButton,
              pressed ? styles.saveButtonPressed : null,
            ]}
          >
            <Text style={styles.dateFieldLabel}>Month</Text>
            <Text style={styles.dateFieldValue}>{formatTwoDigits(dateParts.month)}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open step target day dropdown"
            onPress={() => setActiveDateField((current) => (current === 'day' ? null : 'day'))}
            style={({ pressed }) => [
              styles.dateFieldButton,
              pressed ? styles.saveButtonPressed : null,
            ]}
          >
            <Text style={styles.dateFieldLabel}>Day</Text>
            <Text style={styles.dateFieldValue}>{formatTwoDigits(dateParts.day)}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open step target year dropdown"
            onPress={() => setActiveDateField((current) => (current === 'year' ? null : 'year'))}
            style={({ pressed }) => [
              styles.dateFieldButton,
              pressed ? styles.saveButtonPressed : null,
            ]}
          >
            <Text style={styles.dateFieldLabel}>Year</Text>
            <Text style={styles.dateFieldValue}>{dateParts.year}</Text>
          </Pressable>
        </View>

        {activeDateField ? (
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>
              {activeDateField === 'month'
                ? 'Select month'
                : activeDateField === 'day'
                  ? 'Select day'
                  : 'Select year'}
            </Text>
            <ScrollView style={styles.dropdownList} nestedScrollEnabled>
              {(activeDateField === 'month'
                ? MONTH_OPTIONS.map((option) => ({ value: option.value, label: option.label }))
                : activeDateField === 'day'
                  ? dayOptions.map((day) => ({ value: day, label: formatTwoDigits(day) }))
                  : yearOptions.map((year) => ({ value: year, label: String(year) }))
              ).map((option) => (
                <Pressable
                  key={`${activeDateField}-${option.value}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select step target ${activeDateField} ${option.label}`}
                  onPress={() => updateDateField(activeDateField, option.value)}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    pressed ? styles.saveButtonPressed : null,
                  ]}
                >
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AppButton
        label="Save Step"
        accessibilityLabel="Save step"
        onPress={handleSave}
        loading={saving}
        loadingLabel="Saving..."
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  dateFieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateFieldButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  dateFieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  dateFieldValue: {
    ...typography.body,
    color: colors.text,
  },
  dateSummary: {
    ...typography.body,
    color: colors.text,
  },
  dateHint: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  dropdownCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dropdownTitle: {
    ...typography.helper,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  dropdownList: {
    maxHeight: 176,
  },
  dropdownOption: {
    minHeight: 44,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  saveButton: {
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
