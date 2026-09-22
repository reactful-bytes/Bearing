import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { IconButton } from '../ui/IconButton';
import { MonthGrid, MONTH_NAMES } from '../calendar/MonthGrid';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

export type GoalDateParts = {
  month: number;
  day: number;
  year: number;
};

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

export function isTodayOrFutureDate(date: Date, today: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dateOnly.getTime() >= todayOnly.getTime();
}

type GoalDatePickerProps = {
  title: string;
  accessibilityPrefix: string;
  dateParts: GoalDateParts;
  onSelectDate: (date: Date) => void;
};

export function GoalDatePicker({
  title,
  accessibilityPrefix,
  dateParts,
  onSelectDate,
}: GoalDatePickerProps) {
  const styles = useThemedStyles(createStyles);
  const { width: screenWidth } = useWindowDimensions();
  const [overlay, setOverlay] = useState<'month' | 'year' | null>(null);
  const [calendarWidth, setCalendarWidth] = useState(0);
  const calendarDate = getGoalDateFromParts(dateParts);
  const calendarYear = dateParts.year;
  const calendarMonth = dateParts.month - 1;
  const width = calendarWidth || Math.max(screenWidth - spacing.lg * 2, 280);
  const today = useMemo(() => new Date(), []);
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const currentYear = todayOnly.getFullYear();
  const currentMonth = todayOnly.getMonth();
  const firstYear = Math.min(currentYear, calendarYear);
  const yearOptions = Array.from({ length: 12 }, (_, index) => firstYear + index);

  function makeDate(year: number, month: number): Date {
    const day = Math.min(dateParts.day, getDayOptions(month + 1, year).length);
    return new Date(year, month, day);
  }

  function selectMonth(month: number): void {
    if (calendarYear === currentYear && month < currentMonth) {
      return;
    }
    onSelectDate(makeDate(calendarYear, month));
    setOverlay(null);
  }

  function selectYear(year: number): void {
    if (year < currentYear) {
      return;
    }
    onSelectDate(makeDate(year, calendarMonth));
    setOverlay(null);
  }

  function shiftMonth(amount: number): void {
    const shiftedDate = new Date(calendarYear, calendarMonth + amount, 1);
    if (
      amount < 0 &&
      (shiftedDate.getFullYear() < currentYear ||
        (shiftedDate.getFullYear() === currentYear && shiftedDate.getMonth() < currentMonth))
    ) {
      return;
    }
    onSelectDate(makeDate(shiftedDate.getFullYear(), shiftedDate.getMonth()));
  }

  return (
    <View style={styles.section}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{title}</Text>
      </View>

      <View
        style={styles.calendarCard}
        onLayout={(event) => setCalendarWidth(event.nativeEvent.layout.width)}
      >
        <View style={styles.todayRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set ${accessibilityPrefix} date to today`}
            onPress={() => onSelectDate(todayOnly)}
            style={({ pressed }) => [styles.todayButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>
        <View style={styles.monthNavRow}>
          <IconButton
            name="back"
            accessibilityLabel={`Previous month for ${accessibilityPrefix}`}
            onPress={() => shiftMonth(-1)}
            disabled={
              calendarYear === currentYear && calendarMonth === currentMonth
                ? true
                : calendarYear < currentYear ||
                  (calendarYear === currentYear && calendarMonth < currentMonth)
            }
          />
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${accessibilityPrefix} month`}
              onPress={() => setOverlay(overlay === 'month' ? null : 'month')}
              style={({ pressed }) => [styles.headerButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.monthHeaderText}>{MONTH_NAMES[calendarMonth]}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${accessibilityPrefix} year`}
              onPress={() => setOverlay(overlay === 'year' ? null : 'year')}
              style={({ pressed }) => [styles.headerButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.monthHeaderText}>{calendarYear}</Text>
            </Pressable>
          </View>
          <IconButton
            name="back"
            accessibilityLabel={`Next month for ${accessibilityPrefix}`}
            onPress={() => shiftMonth(1)}
            style={styles.nextIcon}
          />
        </View>

        {overlay === 'month' ? (
          <View style={styles.selectionGrid}>
            {MONTH_NAMES.map((month, index) => (
              <Pressable
                key={month}
                accessibilityRole="button"
                accessibilityLabel={`Select ${accessibilityPrefix} ${month}`}
                accessibilityState={{ selected: index === calendarMonth }}
                onPress={() => selectMonth(index)}
                disabled={
                  calendarYear < currentYear ||
                  (calendarYear === currentYear && index < currentMonth)
                }
                style={({ pressed }) => [
                  styles.selectionOption,
                  index === calendarMonth ? styles.selectionOptionSelected : null,
                  calendarYear < currentYear ||
                  (calendarYear === currentYear && index < currentMonth)
                    ? styles.disabledOption
                    : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.selectionOptionText}>{month.slice(0, 3)}</Text>
              </Pressable>
            ))}
          </View>
        ) : overlay === 'year' ? (
          <View style={styles.selectionGrid}>
            {yearOptions.map((year) => (
              <Pressable
                key={year}
                accessibilityRole="button"
                accessibilityLabel={`Select ${accessibilityPrefix} year ${year}`}
                accessibilityState={{ selected: year === calendarYear }}
                onPress={() => selectYear(year)}
                disabled={year < currentYear}
                style={({ pressed }) => [
                  styles.selectionOption,
                  year === calendarYear ? styles.selectionOptionSelected : null,
                  year < currentYear ? styles.disabledOption : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.selectionOptionText}>{year}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <MonthGrid
            year={calendarYear}
            month={calendarMonth}
            selectedDate={calendarDate}
            eventDays={new Set()}
            onSelectDate={onSelectDate}
            width={width}
            minDate={todayOnly}
          />
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    fieldGroup: {
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    calendarCard: {
      paddingHorizontal: 0,
      paddingVertical: spacing.sm,
    },
    todayRow: {
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md,
    },
    todayButton: {
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    todayButtonText: {
      ...typography.label,
      color: theme.colors.brand,
      fontWeight: '700',
    },
    monthNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
    },
    monthHeader: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    headerButton: {
      borderRadius: radii.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    monthHeaderText: {
      ...typography.sectionTitle,
      color: theme.colors.text,
      fontSize: 18,
    },
    nextIcon: {
      transform: [{ rotate: '180deg' }],
    },
    selectionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.sm,
      gap: spacing.xs,
    },
    selectionOption: {
      width: '31.5%',
      minHeight: 42,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectionOptionSelected: {
      backgroundColor: theme.colors.brand,
    },
    disabledOption: {
      opacity: 0.35,
    },
    selectionOptionText: {
      ...typography.body,
      color: theme.colors.text,
    },
    buttonPressed: {
      opacity: 0.86,
    },
  });
