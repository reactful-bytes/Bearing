import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';

export type SegmentedControlOption<Value extends string> = {
  value: Value;
  label: string;
  count?: number;
};

type SegmentedControlProps<Value extends string> = {
  accessibilityLabel: string;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

export function SegmentedControl<Value extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const optionAccessibilityLabel =
          option.count === undefined ? option.label : `${option.label}, ${option.count}`;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={optionAccessibilityLabel}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected ? styles.optionSelected : null,
              pressed ? styles.optionPressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, isSelected ? styles.labelSelected : null]}
            >
              {option.label}
            </Text>
            {option.count === undefined ? null : (
              <Text
                numberOfLines={1}
                style={[styles.count, isSelected ? styles.countSelected : null]}
              >
                {option.count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs,
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  optionPressed: {
    opacity: 0.82,
  },
  label: {
    ...typography.helper,
    color: colors.textSecondary,
    fontWeight: '600',
    flexShrink: 1,
  },
  labelSelected: {
    color: colors.text,
  },
  count: {
    ...typography.helper,
    color: colors.textSecondary,
    fontWeight: '700',
    flexShrink: 0,
  },
  countSelected: {
    color: colors.brand,
  },
});
