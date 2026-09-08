import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type ProgressBarAccent = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

export type ProgressBarProps = {
  value: number;
  max?: number;
  accent?: ProgressBarAccent;
  showPercentage?: boolean;
  accessibilityLabel?: string;
  accessibilityValueText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ProgressBar({
  value,
  max = 100,
  accent = 'brand',
  showPercentage = false,
  accessibilityLabel = 'Progress',
  accessibilityValueText,
  style,
  testID,
}: ProgressBarProps) {
  const styles = useThemedStyles(createStyles);
  const safeMax = Math.max(0, max);
  const clampedValue = safeMax === 0 ? 0 : Math.min(Math.max(0, value), safeMax);
  const percentage = safeMax === 0 ? 0 : Math.round((clampedValue / safeMax) * 100);

  return (
    <View style={[styles.container, style]}>
      <View
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{
          min: 0,
          max: safeMax,
          now: clampedValue,
          text: accessibilityValueText ?? `${percentage}%`,
        }}
        style={styles.track}
      >
        <View
          testID={testID ? `${testID}-fill` : undefined}
          style={[styles.fill, styles[accent], { width: `${percentage}%` }]}
        />
      </View>
      {showPercentage ? <Text style={styles.percentage}>{percentage}%</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    track: {
      height: theme.spacing.sm,
      minWidth: 0,
      flex: 1,
      overflow: 'hidden',
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    fill: {
      height: '100%',
      borderRadius: theme.radii.sm,
    },
    brand: { backgroundColor: theme.colors.brand },
    success: { backgroundColor: theme.colors.success },
    warning: { backgroundColor: theme.colors.warning },
    danger: { backgroundColor: theme.colors.danger },
    neutral: { backgroundColor: theme.colors.textSecondary },
    percentage: {
      ...theme.typography.helper,
      color: theme.colors.textSecondary,
    },
  });
