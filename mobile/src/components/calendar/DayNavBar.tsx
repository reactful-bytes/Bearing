import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { IconButton } from '../ui/IconButton';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

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
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <IconButton name="back" accessibilityLabel="Previous day" onPress={onPrev} />
      <Text style={styles.label} numberOfLines={1}>
        {formatDayLabel(date)}
      </Text>
      <IconButton name="next" accessibilityLabel="Next day" onPress={onNext} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    label: {
      ...typography.sectionTitle,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
  });
