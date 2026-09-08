import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { ViewMode } from '../../features/calendar/calendarTypes';

type ViewModeToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  showWeek?: boolean;
};

const MODES: { key: ViewMode; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export function ViewModeToggle({ mode, onChange, showWeek = false }: ViewModeToggleProps) {
  const styles = useThemedStyles(createStyles);
  const visibleModes = showWeek ? MODES : MODES.filter(({ key }) => key !== 'week');

  return (
    <View style={styles.container}>
      {visibleModes.map(({ key, label }) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={`${label} view`}
          accessibilityState={{ selected: mode === key }}
          onPress={() => onChange(key)}
          style={[styles.segment, mode === key ? styles.segmentActive : null]}
        >
          <Text style={[styles.label, mode === key ? styles.labelActive : null]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: radii.md,
      padding: 3,
      alignSelf: 'center',
      marginVertical: spacing.sm,
    },
    segment: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      alignItems: 'center',
      minWidth: 56,
    },
    segmentActive: {
      backgroundColor: theme.colors.brand,
    },
    label: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    labelActive: {
      color: '#F4F8FA',
    },
  });
