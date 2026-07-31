import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';

type MonthGridProps = {
  year: number;
  month: number; // 0-indexed (0 = January)
  selectedDate: Date;
  eventDays: Set<number>; // day numbers (1–31) that have at least one event
  onSelectDate: (date: Date) => void;
  width: number; // page width supplied by parent
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
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
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

export function MonthGrid({
  year,
  month,
  selectedDate,
  eventDays,
  onSelectDate,
  width,
}: MonthGridProps) {
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

            return (
              <Pressable
                key={dayIdx}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[month]} ${day}, ${year}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDate(new Date(year, month, day))}
                style={[styles.cell, { width: cellWidth }]}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected ? styles.dayCircleSelected : null,
                    isToday && !isSelected ? styles.dayCircleToday : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected ? styles.dayNumberSelected : null,
                      isToday && !isSelected ? styles.dayNumberToday : null,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                {hasEvents ? (
                  <View style={styles.eventDot} />
                ) : (
                  <View style={styles.eventDotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  dayHeader: {
    ...typography.helper,
    fontSize: 12,
    color: colors.textSecondary,
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
  dayCircleSelected: {
    backgroundColor: colors.brand,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  dayNumber: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
  },
  dayNumberSelected: {
    color: '#F4F8FA',
    fontWeight: '700',
  },
  dayNumberToday: {
    color: colors.brand,
    fontWeight: '700',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.brand,
    marginTop: 2,
  },
  eventDotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
});
