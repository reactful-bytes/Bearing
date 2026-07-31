import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { colors, radii, spacing, typography } from '../../design/tokens';

export type GoalDateField = 'month' | 'day' | 'year';

export type GoalDateParts = {
  month: number;
  day: number;
  year: number;
};

export type DatePickerOption = {
  value: number;
  label: string;
};

export const MONTH_OPTIONS = [
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

export const YEAR_OPTION_COUNT = 51;

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function buildDefaultGoalDateParts(baseDate: Date): GoalDateParts {
  const tomorrow = addDays(baseDate, 1);
  return {
    month: tomorrow.getMonth() + 1,
    day: tomorrow.getDate(),
    year: tomorrow.getFullYear(),
  };
}

export function buildGoalDateParts(date: Date): GoalDateParts {
  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    year: date.getFullYear(),
  };
}

export function formatTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatGoalDateParts(parts: GoalDateParts): string {
  return `${formatTwoDigits(parts.month)}-${formatTwoDigits(parts.day)}-${parts.year}`;
}

export function getGoalDateFromParts(parts: GoalDateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function getDayOptions(month: number, year: number): number[] {
  const maxDay = new Date(year, month, 0).getDate();
  return Array.from({ length: maxDay }, (_, index) => index + 1);
}

export function isFutureDate(date: Date, today: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dateOnly.getTime() > todayOnly.getTime();
}

type GoalDatePickerProps = {
  title: string;
  summaryLabel: string;
  helperText: string;
  accessibilityPrefix: string;
  dateParts: GoalDateParts;
  activeField: GoalDateField | null;
  optionsByField: Record<GoalDateField, DatePickerOption[]>;
  onToggleField: (field: GoalDateField) => void;
  onSelectField: (field: GoalDateField, value: number) => void;
};

export function GoalDatePicker({
  title,
  summaryLabel,
  helperText,
  accessibilityPrefix,
  dateParts,
  activeField,
  optionsByField,
  onToggleField,
  onSelectField,
}: GoalDatePickerProps) {
  const activeOptions = activeField ? optionsByField[activeField] : [];

  return (
    <View style={styles.section}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.dateSummary}>{summaryLabel}</Text>
        <Text style={styles.dateHint}>{helperText}</Text>
      </View>

      <View style={styles.dateFieldRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${accessibilityPrefix} month dropdown`}
          onPress={() => onToggleField('month')}
          style={({ pressed }) => [styles.dateFieldButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.dateFieldLabel}>Month</Text>
          <Text style={styles.dateFieldValue}>{formatTwoDigits(dateParts.month)}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${accessibilityPrefix} day dropdown`}
          onPress={() => onToggleField('day')}
          style={({ pressed }) => [styles.dateFieldButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.dateFieldLabel}>Day</Text>
          <Text style={styles.dateFieldValue}>{formatTwoDigits(dateParts.day)}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${accessibilityPrefix} year dropdown`}
          onPress={() => onToggleField('year')}
          style={({ pressed }) => [styles.dateFieldButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.dateFieldLabel}>Year</Text>
          <Text style={styles.dateFieldValue}>{dateParts.year}</Text>
        </Pressable>
      </View>

      {activeField ? (
        <AppCard style={styles.dropdownCard}>
          <Text style={styles.dropdownTitle}>
            {activeField === 'month'
              ? 'Select month'
              : activeField === 'day'
                ? 'Select day'
                : 'Select year'}
          </Text>
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {activeOptions.map((option) => (
              <Pressable
                key={`${accessibilityPrefix}-${activeField}-${option.value}`}
                accessibilityRole="button"
                accessibilityLabel={`Select ${accessibilityPrefix} ${activeField} ${option.label}`}
                onPress={() => onSelectField(activeField, option.value)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </AppCard>
      ) : null}
    </View>
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
  dateFieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateFieldButton: {
    flex: 1,
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
    gap: spacing.sm,
    paddingVertical: spacing.md,
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
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.86,
  },
});
