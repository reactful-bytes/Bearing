import { CSSProperties } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
import { DEFAULT_TIME_FORMAT, TimeFormat } from '../../features/profile/timeFormat';

type EventDateTimePickerFieldProps = {
  label: string;
  accessibilityLabel: string;
  mode: 'date' | 'time';
  value: string;
  dateValue: string;
  timeValue: string;
  timezone: string;
  locale?: string;
  timeFormat?: TimeFormat;
  fallbackDateValue?: string;
  allowClear?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onChange: (value: string) => void;
};

const webInputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  minHeight: 44,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  backgroundColor: colors.surface,
  color: colors.text,
  fontSize: typography.body.fontSize,
  lineHeight: `${typography.body.lineHeight}px`,
  padding: `${spacing.sm}px ${spacing.md}px`,
};

export function EventDateTimePickerField({
  label,
  accessibilityLabel,
  mode,
  value,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  allowClear = false,
  containerStyle,
  onChange,
}: EventDateTimePickerFieldProps) {
  const language = mode === 'time' ? (timeFormat === '24-hour' ? 'en-GB' : 'en-US') : locale;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controlRow}>
        <View style={styles.inputContainer}>
          <input
            aria-label={accessibilityLabel}
            lang={language}
            type={mode}
            value={value}
            step={mode === 'time' ? 60 : undefined}
            onChange={(event) => onChange(event.currentTarget.value)}
            style={webInputStyle}
          />
        </View>
        {allowClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => onChange('')}
            style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    minWidth: 0,
  },
  clearButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
