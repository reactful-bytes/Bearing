import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 3,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  segment: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    minWidth: 72,
  },
  segmentActive: {
    backgroundColor: colors.brand,
  },
  label: {
    ...typography.button,
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#F4F8FA',
  },
});
