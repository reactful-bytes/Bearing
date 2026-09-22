import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type MonthGridProps = {
  year: number;
  month: number; // 0-indexed (0 = January)
  selectedDate: Date;
  eventDays: Set<number>; // day numbers (1–31) that have at least one event
  onSelectDate: (date: Date) => void;
  width: number; // page width supplied by parent
  minDate?: Date;
};

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function buildWeeks(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const DAY_CIRCLE_SIZE = 34;

// Exact pixel accounting for the styles below, so the carousel can be sized to
// fit the visible month with no leftover/wasted vertical space.
const HEADER_ROW_HEIGHT = 20 + spacing.xs * 2; // dayHeader lineHeight + cell paddingVertical
const HEADER_ROW_MARGIN_BOTTOM = spacing.xs;
const WEEK_ROW_HEIGHT = DAY_CIRCLE_SIZE + 7 + spacing.xs * 2; // circle + event dot + cell paddingVertical
const CONTAINER_VERTICAL_PADDING = spacing.sm * 2;

export function getMonthGridHeight(year: number, month: number): number {
  const weekCount = buildWeeks(year, month).length;
  return (
    CONTAINER_VERTICAL_PADDING +
    HEADER_ROW_HEIGHT +
    HEADER_ROW_MARGIN_BOTTOM +
    weekCount * WEEK_ROW_HEIGHT
  );
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  eventDays,
  onSelectDate,
  width,
  minDate,
}: MonthGridProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const weeks = buildWeeks(year, month);
  const today = new Date();
  const cellWidth = Math.floor(width / 7);

  return (
    <View style={[styles.container, { width }]}>
      {/* Day-of-week headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((d) => (
          <View key={d} style={[styles.cell, { width: cellWidth }]}>
            <Text style={styles.dayHeader}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, weekIdx) => (
        <View key={weekIdx} style={styles.weekRow}>
          {week.map((day, dayIdx) => {
            if (!day) {
              return <View key={dayIdx} style={[styles.cell, { width: cellWidth }]} />;
            }

            const isSelected =
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() === month &&
              selectedDate.getDate() === day;
            const isToday =
              today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const hasEvents = eventDays.has(day);
            const isBeforeMinDate =
              minDate !== undefined &&
              new Date(year, month, day).getTime() <
                new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();

            return (
              <View key={dayIdx} style={[styles.cell, { width: cellWidth }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTH_NAMES[month]} ${day}, ${year}`}
                  accessibilityState={{ selected: isSelected, disabled: isBeforeMinDate }}
                  onPress={() => onSelectDate(new Date(year, month, day))}
                  disabled={isBeforeMinDate}
                  style={styles.dayPressTarget}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: pressed
                            ? theme.colors.surfacePressed
                            : isSelected
                              ? theme.colors.brand
                              : 'transparent',
                          borderWidth: isToday && !isSelected ? 1.5 : 0,
                          borderColor: theme.colors.brand,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          {
                            color: isSelected ? '#F4F8FA' : theme.colors.text,
                            fontWeight: isSelected || isToday ? '700' : '400',
                          },
                          isBeforeMinDate ? styles.disabledDay : null,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  )}
                </Pressable>
                {hasEvents ? (
                  <View style={styles.eventDot} />
                ) : (
                  <View style={styles.eventDotPlaceholder} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    weekRow: {
      flexDirection: 'row',
    },
    cell: {
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    dayPressTarget: {
      width: DAY_CIRCLE_SIZE,
      height: DAY_CIRCLE_SIZE,
      borderRadius: DAY_CIRCLE_SIZE / 2,
    },
    dayHeader: {
      ...typography.helper,
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      textAlign: 'center',
    },
    dayCircle: {
      width: DAY_CIRCLE_SIZE,
      height: DAY_CIRCLE_SIZE,
      borderRadius: DAY_CIRCLE_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumber: {
      ...typography.body,
      fontSize: 15,
      color: theme.colors.text,
    },
    disabledDay: {
      opacity: 0.35,
    },
    eventDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.colors.brand,
      marginTop: 2,
    },
    eventDotPlaceholder: {
      width: 5,
      height: 5,
      marginTop: 2,
    },
  });
