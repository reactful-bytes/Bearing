import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EventDateTimePickerField } from '../calendar/EventDateTimePickerField';
import { AppButton } from '../ui/AppButton';
import { layout, radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { TimeFormat } from '../../features/profile/timeFormat';

export type TaskScheduleFieldsProps = {
  visible: boolean;
  onToggle: () => void;
  dueDate: string;
  scheduledStartDate: string;
  scheduledStartTime: string;
  scheduledEndDate: string;
  scheduledEndTime: string;
  allDay: boolean;
  onDueDateChange: (value: string) => void;
  onScheduledStartDateChange: (value: string) => void;
  onScheduledStartTimeChange: (value: string) => void;
  onScheduledEndDateChange: (value: string) => void;
  onScheduledEndTimeChange: (value: string) => void;
  onAllDayChange: (value: boolean) => void;
  timezone: string;
  locale?: string;
  timeFormat?: TimeFormat;
};

export function TaskScheduleFields({
  visible,
  onToggle,
  dueDate,
  scheduledStartDate,
  scheduledStartTime,
  scheduledEndDate,
  scheduledEndTime,
  allDay,
  onDueDateChange,
  onScheduledStartDateChange,
  onScheduledStartTimeChange,
  onScheduledEndDateChange,
  onScheduledEndTimeChange,
  onAllDayChange,
  timezone,
  locale,
  timeFormat,
}: TaskScheduleFieldsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <AppButton
        label={visible ? 'Hide schedule details' : 'Add schedule details'}
        variant="secondary"
        accessibilityLabel={visible ? 'Hide schedule details' : 'Add schedule details'}
        onPress={onToggle}
      />

      {visible ? (
        <View style={styles.scheduleSection}>
          <EventDateTimePickerField
            label="Due date"
            accessibilityLabel="Task due date"
            mode="date"
            value={dueDate}
            dateValue={dueDate}
            timeValue="12:00"
            timezone={timezone}
            locale={locale}
            timeFormat={timeFormat}
            allowClear
            compact
            onChange={onDueDateChange}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="All-day task"
            accessibilityState={{ checked: allDay }}
            onPress={() => onAllDayChange(!allDay)}
            style={styles.allDayToggle}
          >
            <Text style={styles.allDayToggleText}>{allDay ? 'All day: On' : 'All day: Off'}</Text>
          </Pressable>
          <EventDateTimePickerField
            label="Schedule start date"
            accessibilityLabel="Task schedule start date"
            mode="date"
            value={scheduledStartDate}
            dateValue={scheduledStartDate}
            timeValue={scheduledStartTime}
            timezone={timezone}
            locale={locale}
            timeFormat={timeFormat}
            allowClear
            compact
            onChange={onScheduledStartDateChange}
          />
          {!allDay ? (
            <EventDateTimePickerField
              label="Schedule start time"
              accessibilityLabel="Task schedule start time"
              mode="time"
              value={scheduledStartTime}
              dateValue={scheduledStartDate}
              timeValue={scheduledStartTime}
              timezone={timezone}
              locale={locale}
              timeFormat={timeFormat}
              allowClear
              compact
              onChange={onScheduledStartTimeChange}
            />
          ) : null}
          <EventDateTimePickerField
            label="Schedule end date"
            accessibilityLabel="Task schedule end date"
            mode="date"
            value={scheduledEndDate}
            dateValue={scheduledEndDate}
            timeValue={scheduledEndTime}
            timezone={timezone}
            locale={locale}
            timeFormat={timeFormat}
            allowClear
            compact
            onChange={onScheduledEndDateChange}
          />
          {!allDay ? (
            <EventDateTimePickerField
              label="Schedule end time"
              accessibilityLabel="Task schedule end time"
              mode="time"
              value={scheduledEndTime}
              dateValue={scheduledEndDate}
              timeValue={scheduledEndTime}
              timezone={timezone}
              locale={locale}
              timeFormat={timeFormat}
              allowClear
              compact
              onChange={onScheduledEndTimeChange}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scheduleSection: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    allDayToggle: {
      minHeight: layout.minimumTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
    },
    allDayToggleText: {
      ...typography.body,
      color: theme.colors.text,
    },
  });