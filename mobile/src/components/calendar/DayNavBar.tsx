import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';

type DayNavBarProps = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
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

export function formatDayLabel(date: Date): string {
  const day = DAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  const dateNum = date.getDate();
  const year = date.getFullYear();
  return `${day}, ${month} ${dateNum}, ${year}`;
}

export function DayNavBar({ date, onPrev, onNext }: DayNavBarProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        onPress={onPrev}
        style={({ pressed }) => [styles.arrow, pressed ? styles.arrowPressed : null]}
      >
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Text style={styles.label} numberOfLines={1}>
        {formatDayLabel(date)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        onPress={onNext}
        style={({ pressed }) => [styles.arrow, pressed ? styles.arrowPressed : null]}
      >
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  arrow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 36,
    alignItems: 'center',
  },
  arrowPressed: {
    opacity: 0.6,
  },
  arrowText: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.brand,
    fontWeight: '300',
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
