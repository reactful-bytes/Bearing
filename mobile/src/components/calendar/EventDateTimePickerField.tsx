import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppModal } from '../ui/AppModal';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  eventFormValueToDate,
  toEventDateString,
  toEventTimeString,
} from '../../features/calendar/eventEditor';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  formatClockTime,
} from '../../features/profile/timeFormat';
import { useState } from 'react';

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
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onChange: (value: string) => void;
};

function parseDateForDisplay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function parseTimeForDisplay(value: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
}

function formatPickerValue(
  mode: 'date' | 'time',
  value: string,
  timeFormat: TimeFormat,
  locale?: string,
): string {
  if (!value) return 'Not set';

  if (mode === 'date') {
    const date = parseDateForDisplay(value);
    return date
      ? new Intl.DateTimeFormat(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(date)
      : value;
  }

  const time = parseTimeForDisplay(value);
  return time ? formatClockTime(time, timeFormat, locale) : value;
}

export function EventDateTimePickerField({
  label,
  accessibilityLabel,
  mode,
  value,
  dateValue,
  timeValue,
  timezone,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  fallbackDateValue,
  allowClear = false,
  compact = false,
  containerStyle,
  onChange,
}: EventDateTimePickerFieldProps) {
  const styles = useThemedStyles(createStyles);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const effectiveDateValue = dateValue || fallbackDateValue || toEventDateString(new Date());
  const pickerValue =
    eventFormValueToDate(
      effectiveDateValue,
      mode === 'date' ? timeValue || '12:00' : timeValue,
      timezone,
    ) ?? new Date();

  function handleValueChange(_event: DateTimePickerChangeEvent, selectedDate?: Date): void {
    if (!selectedDate) return;

    onChange(
      mode === 'date'
        ? toEventDateString(selectedDate, timezone)
        : toEventTimeString(selectedDate, timezone),
    );
  }

  function handleOpen(): void {
    setPickerError(null);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode,
        display: 'default',
        timeZoneName: timezone,
        is24Hour: mode === 'time' ? timeFormat === '24-hour' : undefined,
        onChange: handleValueChange,
      });
      return;
    }

    if (Platform.OS !== 'ios') {
      setPickerError('Date and time pickers are available in the iOS and Android app.');
      return;
    }

    setIosPickerVisible(true);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, compact ? styles.compactLabel : null]}>{label}</Text>
      <View style={styles.controlRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={handleOpen}
          style={({ pressed }) => [
            styles.fieldButton,
            compact ? styles.compactFieldButton : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text
            style={[
              styles.value,
              compact ? styles.compactValue : null,
              !value ? styles.placeholder : null,
            ]}
            numberOfLines={1}
          >
            {formatPickerValue(mode, value, timeFormat, locale)}
          </Text>
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => onChange('')}
            style={({ pressed }) => [
              styles.clearButton,
              compact ? styles.compactClearButton : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {pickerError ? <Text style={styles.errorText}>{pickerError}</Text> : null}

      {Platform.OS === 'ios' ? (
        <AppModal
          visible={iosPickerVisible}
          title={`Choose ${label.toLowerCase()}`}
          onClose={() => setIosPickerVisible(false)}
          closeLabel="Done"
        >
          <DateTimePicker
            testID={`${accessibilityLabel} picker`}
            value={pickerValue}
            mode={mode}
            display="spinner"
            timeZoneName={timezone}
            locale={mode === 'time' ? (timeFormat === '24-hour' ? 'en-GB' : 'en-US') : locale}
            themeVariant="light"
            onValueChange={handleValueChange}
            style={styles.iosPicker}
          />
        </AppModal>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    compactLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    controlRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    fieldButton: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    compactFieldButton: {
      minHeight: 40,
      paddingVertical: spacing.xs,
    },
    value: {
      ...typography.body,
      color: theme.colors.text,
    },
    compactValue: {
      ...typography.helper,
      color: theme.colors.text,
    },
    placeholder: {
      color: theme.colors.textSecondary,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    clearButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    compactClearButton: {
      minHeight: 40,
    },
    clearText: {
      ...typography.helper,
      color: theme.colors.brand,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.7,
    },
    iosPicker: {
      alignSelf: 'stretch',
    },
  });
