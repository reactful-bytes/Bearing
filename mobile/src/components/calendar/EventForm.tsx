import { ReactNode, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { FormField } from '../ui/FormField';
import { ListItem } from '../ui/ListItem';
import { EventDateTimePickerField } from './EventDateTimePickerField';
import { TimeZoneModal } from '../ui/TimeZoneModal';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  CreateEventInput,
  CreateEventOptions,
  EVENT_WEEKDAYS,
  EventAvailability,
  EventWeekday,
} from '../../features/calendar/calendarTypes';
import {
  CalendarEventFormValues,
  EventFormRecurrenceEndMode,
  EventFormRecurrenceFrequency,
  buildCalendarEventFormValues,
  parseCalendarEventForm,
} from '../../features/calendar/eventEditor';
import { DEFAULT_TIME_FORMAT, TimeFormat } from '../../features/profile/timeFormat';
import { getSelectionLabel } from '../../features/options/selectionOptions';
import { TIMEZONE_OPTIONS } from '../../features/timezone/timezoneOptions';

export type EventFormProps = {
  active: boolean;
  initialDate: Date;
  initialValues?: Partial<CreateEventInput>;
  publicationCalendarTitle?: string | null;
  locale?: string;
  timeFormat?: TimeFormat;
  saveLabel?: string;
  fullScreen?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
  beforeSave?: ReactNode;
  cancelSave?: {
    accessibilityLabel: string;
    onPress: () => void;
  };
  saveDisabled?: boolean;
  saveAccessibilityLabel?: string;
  onSave: (input: CreateEventInput, options: CreateEventOptions) => Promise<void>;
};

const RECURRENCE_OPTIONS: { label: string; value: EventFormRecurrenceFrequency }[] = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom' },
];

const WEEKDAY_LABELS: Record<EventWeekday, { short: string; full: string }> = {
  sunday: { short: 'Sun', full: 'Sunday' },
  monday: { short: 'Mon', full: 'Monday' },
  tuesday: { short: 'Tue', full: 'Tuesday' },
  wednesday: { short: 'Wed', full: 'Wednesday' },
  thursday: { short: 'Thu', full: 'Thursday' },
  friday: { short: 'Fri', full: 'Friday' },
  saturday: { short: 'Sat', full: 'Saturday' },
};

const AVAILABILITY_OPTIONS: { label: string; value: EventAvailability }[] = [
  { label: 'Busy', value: 'busy' },
  { label: 'Free', value: 'free' },
  { label: 'Tentative', value: 'tentative' },
  { label: 'Unavailable', value: 'unavailable' },
];

type AlertSelector = 'first' | 'second';

const ALERT_TIMING_OPTIONS = [
  { label: 'No alert', value: 'none' },
  { label: 'At event time', value: '0' },
  { label: '5 minutes before', value: '-5' },
  { label: '10 minutes before', value: '-10' },
  { label: '15 minutes before', value: '-15' },
  { label: '30 minutes before', value: '-30' },
  { label: '60 minutes before', value: '-60' },
] as const;

function nextDate(dateValue: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return date.toISOString().slice(0, 10);
}

function formatAlertTiming(timing: string): string {
  const option = ALERT_TIMING_OPTIONS.find((candidate) => candidate.value === timing);
  if (option) return option.label;

  const offset = Number(timing);
  if (!Number.isSafeInteger(offset)) return 'Custom alert timing';
  if (offset === 0) return 'At event time';

  const minutes = Math.abs(offset);
  return `Custom: ${minutes} minute${minutes === 1 ? '' : 's'} ${offset < 0 ? 'before' : 'after'}`;
}

function getRecurrenceIntervalCopy(values: CalendarEventFormValues): {
  unit: string;
  helperText: string;
} {
  const frequency = values.recurrenceFrequency === 'custom' ? 'weekly' : values.recurrenceFrequency;
  const unit =
    frequency === 'daily'
      ? 'day'
      : frequency === 'weekly'
        ? 'week'
        : frequency === 'monthly'
          ? 'month'
          : 'year';
  const interval = /^\d+$/.test(values.recurrenceInterval)
    ? Number(values.recurrenceInterval)
    : Number.NaN;

  if (!Number.isSafeInteger(interval) || interval < 1 || interval > 999) {
    return { unit, helperText: 'Enter a whole number from 1 to 999.' };
  }

  const weekdayNames = values.recurrenceWeekdays.map((weekday) => WEEKDAY_LABELS[weekday].full);
  const weekdayCopy =
    values.recurrenceFrequency === 'custom' && weekdayNames.length > 0
      ? ` on ${weekdayNames.join(', ')}`
      : '';
  return {
    unit,
    helperText: `Repeats every ${interval} ${unit}${interval === 1 ? '' : 's'}${weekdayCopy}.`,
  };
}

export function EventForm({
  active,
  initialDate,
  initialValues,
  publicationCalendarTitle,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  saveLabel = 'Save Event',
  fullScreen = false,
  contentContainerStyle,
  header,
  beforeSave,
  cancelSave,
  saveDisabled = false,
  saveAccessibilityLabel = 'Save event',
  onSave,
}: EventFormProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<CalendarEventFormValues>(() =>
    buildCalendarEventFormValues(initialDate, initialValues),
  );
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishToDevice, setPublishToDevice] = useState(false);
  const [activeAlertSelector, setActiveAlertSelector] = useState<AlertSelector | null>(null);
  const [timezonePickerVisible, setTimezonePickerVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setValues(buildCalendarEventFormValues(initialDate, initialValues));
    setAdvancedVisible(false);
    setError(null);
    setSaving(false);
    setPublishToDevice(false);
    setActiveAlertSelector(null);
    setTimezonePickerVisible(false);
  }, [active, initialDate, initialValues]);

  function updateValue<Key extends keyof CalendarEventFormValues>(
    key: Key,
    value: CalendarEventFormValues[Key],
  ): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleAllDayChange(allDay: boolean): void {
    setValues((current) => {
      const endDate =
        allDay && current.endDate <= current.startDate
          ? (nextDate(current.startDate) ?? current.endDate)
          : current.endDate;
      return { ...current, allDay, endDate };
    });
  }

  function handleAlertTimingChange(selector: AlertSelector, timing: string): void {
    updateValue(selector === 'first' ? 'firstAlertTiming' : 'secondAlertTiming', timing);
    setActiveAlertSelector(null);
  }

  function handleRecurrenceFrequencyChange(frequency: EventFormRecurrenceFrequency): void {
    setValues((current) => {
      if (frequency !== 'custom' || current.recurrenceWeekdays.length > 0) {
        return { ...current, recurrenceFrequency: frequency };
      }

      const startDayIndex = new Date(`${current.startDate}T00:00:00Z`).getUTCDay();
      return {
        ...current,
        recurrenceFrequency: frequency,
        recurrenceWeekdays: [EVENT_WEEKDAYS[startDayIndex]],
      };
    });
  }

  function handleWeekdayChange(weekday: EventWeekday): void {
    setValues((current) => ({
      ...current,
      recurrenceWeekdays: current.recurrenceWeekdays.includes(weekday)
        ? current.recurrenceWeekdays.filter((candidate) => candidate !== weekday)
        : EVENT_WEEKDAYS.filter(
            (candidate) => candidate === weekday || current.recurrenceWeekdays.includes(candidate),
          ),
    }));
  }

  function handleRecurrenceEndModeChange(mode: EventFormRecurrenceEndMode): void {
    setValues((current) => ({
      ...current,
      recurrenceEndMode: mode,
      recurrenceEndDate: mode === 'until' ? current.recurrenceEndDate : '',
      recurrenceOccurrenceCount: mode === 'count' ? current.recurrenceOccurrenceCount || '10' : '',
    }));
  }

  async function handleSave(): Promise<void> {
    setError(null);
    const result = parseCalendarEventForm(values, {
      goalId: initialValues?.goalId ?? null,
      milestoneId: initialValues?.milestoneId ?? null,
    });
    if (!result.input) {
      setError(result.errors[0] ?? 'Event details are invalid.');
      return;
    }

    setSaving(true);
    try {
      await onSave(result.input, { publishToDevice });
    } catch {
      setError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const recurrenceCopy =
    values.recurrenceFrequency !== 'none' ? getRecurrenceIntervalCopy(values) : null;

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          fullScreen
            ? {
                paddingTop: insets.top,
                paddingBottom: spacing.sm + insets.bottom,
              }
            : null,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        <FormField
          label="Title"
          value={values.title}
          onChangeText={(value) => updateValue('title', value)}
          placeholder="Event title"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="sentences"
          returnKeyType="next"
          accessibilityLabel="Event title"
          labelStyle={styles.compactLabel}
          inputStyle={styles.input}
        />

        <FormField
          label="Description (optional)"
          value={values.description}
          onChangeText={(value) => updateValue('description', value)}
          placeholder="Add notes"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          accessibilityLabel="Event description"
          labelStyle={styles.compactLabel}
          inputStyle={styles.textArea}
        />

        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>All day</Text>
          <Switch
            value={values.allDay}
            onValueChange={handleAllDayChange}
            trackColor={{ false: theme.colors.border, true: theme.colors.surfaceBrand }}
            thumbColor={values.allDay ? theme.colors.brand : theme.colors.textSecondary}
            accessibilityLabel="All-day event"
          />
        </View>

        <View style={styles.dateRow}>
          <EventDateTimePickerField
            label="Start date"
            containerStyle={styles.flexField}
            value={values.startDate}
            accessibilityLabel="Start date"
            mode="date"
            dateValue={values.startDate}
            timeValue={values.allDay ? '00:00' : values.startTime}
            timezone={values.timezone}
            locale={locale}
            timeFormat={timeFormat}
            compact
            onChange={(value) => updateValue('startDate', value)}
          />
          <EventDateTimePickerField
            label="End date"
            containerStyle={styles.flexField}
            value={values.endDate}
            accessibilityLabel="End date"
            mode="date"
            dateValue={values.endDate}
            timeValue={values.allDay ? '00:00' : values.endTime}
            timezone={values.timezone}
            locale={locale}
            timeFormat={timeFormat}
            compact
            onChange={(value) => updateValue('endDate', value)}
          />
        </View>

        {!values.allDay ? (
          <View style={styles.dateRow}>
            <EventDateTimePickerField
              label="Start time"
              containerStyle={styles.flexField}
              value={values.startTime}
              accessibilityLabel="Start time"
              mode="time"
              dateValue={values.startDate}
              timeValue={values.startTime}
              timezone={values.timezone}
              locale={locale}
              timeFormat={timeFormat}
              compact
              onChange={(value) => updateValue('startTime', value)}
            />
            <EventDateTimePickerField
              label="End time"
              containerStyle={styles.flexField}
              value={values.endTime}
              accessibilityLabel="End time"
              mode="time"
              dateValue={values.endDate}
              timeValue={values.endTime}
              timezone={values.timezone}
              locale={locale}
              timeFormat={timeFormat}
              compact
              onChange={(value) => updateValue('endTime', value)}
            />
          </View>
        ) : null}

        {publicationCalendarTitle ? (
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <Text style={styles.fieldLabel}>Add to {publicationCalendarTitle}</Text>
              <Text style={styles.helperText}>Creates a linked copy in your device calendar.</Text>
            </View>
            <Switch
              value={publishToDevice}
              onValueChange={setPublishToDevice}
              trackColor={{ false: theme.colors.border, true: theme.colors.surfaceBrand }}
              thumbColor={publishToDevice ? theme.colors.brand : theme.colors.textSecondary}
              accessibilityLabel={`Add to ${publicationCalendarTitle}`}
            />
          </View>
        ) : null}

        <AppButton
          label={advancedVisible ? 'Hide Advanced' : 'Advanced'}
          variant="secondary"
          accessibilityLabel={
            advancedVisible ? 'Hide advanced event fields' : 'Show advanced event fields'
          }
          onPress={() => setAdvancedVisible((current) => !current)}
          style={styles.advancedButton}
        />

        {advancedVisible ? (
          <View style={styles.advancedFields}>
            <ListItem
              title="Time zone"
              accessibilityLabel="Open event timezone picker"
              onPress={() => setTimezonePickerVisible(true)}
              trailingText={getSelectionLabel(TIMEZONE_OPTIONS, values.timezone, values.timezone)}
            />

            <FormField
              label="Location"
              value={values.location}
              onChangeText={(value) => updateValue('location', value)}
              placeholder="Add a location"
              placeholderTextColor={theme.colors.textSecondary}
              accessibilityLabel="Event location"
              labelStyle={styles.compactLabel}
              inputStyle={styles.input}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Repeats</Text>
              <View style={styles.optionWrap}>
                {RECURRENCE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: values.recurrenceFrequency === option.value }}
                    onPress={() => handleRecurrenceFrequencyChange(option.value)}
                    style={[
                      styles.option,
                      values.recurrenceFrequency === option.value ? styles.optionSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        values.recurrenceFrequency === option.value
                          ? styles.optionTextSelected
                          : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {values.recurrenceFrequency === 'custom' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Repeat on</Text>
                <View style={styles.weekdayRow}>
                  {EVENT_WEEKDAYS.map((weekday) => {
                    const selected = values.recurrenceWeekdays.includes(weekday);
                    return (
                      <Pressable
                        key={weekday}
                        accessibilityRole="button"
                        accessibilityLabel={`Repeat on ${WEEKDAY_LABELS[weekday].full}`}
                        accessibilityState={{ selected }}
                        onPress={() => handleWeekdayChange(weekday)}
                        style={({ pressed }) => [
                          styles.weekdayOption,
                          selected ? styles.optionSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          style={[styles.optionText, selected ? styles.optionTextSelected : null]}
                        >
                          {WEEKDAY_LABELS[weekday].short}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {values.recurrenceFrequency !== 'none' ? (
              <>
                <FormField
                  label={`Repeat interval (in ${recurrenceCopy?.unit ?? 'weeks'}s)`}
                  value={values.recurrenceInterval}
                  onChangeText={(value) => updateValue('recurrenceInterval', value)}
                  keyboardType="number-pad"
                  accessibilityLabel="Recurrence interval"
                  helperText={recurrenceCopy?.helperText}
                  helperStyle={styles.helperText}
                  labelStyle={styles.compactLabel}
                  inputStyle={styles.input}
                />
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Duration</Text>
                  <View style={styles.optionWrap}>
                    {(
                      [
                        { label: 'Forever', value: 'forever' },
                        { label: 'After', value: 'count' },
                        { label: 'Until', value: 'until' },
                      ] as const
                    ).map((option) => {
                      const selected = values.recurrenceEndMode === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityLabel={`Repeat ends ${option.label}`}
                          accessibilityState={{ selected }}
                          onPress={() => handleRecurrenceEndModeChange(option.value)}
                          style={[styles.option, selected ? styles.optionSelected : null]}
                        >
                          <Text
                            style={[styles.optionText, selected ? styles.optionTextSelected : null]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {values.recurrenceEndMode === 'count' ? (
                  <FormField
                    label="Times"
                    value={values.recurrenceOccurrenceCount}
                    onChangeText={(value) => updateValue('recurrenceOccurrenceCount', value)}
                    keyboardType="number-pad"
                    accessibilityLabel="Recurrence count"
                    helperText="Number of events in this repeat schedule."
                    helperStyle={styles.helperText}
                    labelStyle={styles.compactLabel}
                    inputStyle={styles.input}
                  />
                ) : null}
                {values.recurrenceEndMode === 'until' ? (
                  <EventDateTimePickerField
                    label="Until date"
                    value={values.recurrenceEndDate}
                    accessibilityLabel="Recurrence end date"
                    mode="date"
                    dateValue={values.recurrenceEndDate}
                    fallbackDateValue={values.endDate}
                    timeValue="12:00"
                    timezone={values.timezone}
                    locale={locale}
                    timeFormat={timeFormat}
                    compact
                    onChange={(value) => updateValue('recurrenceEndDate', value)}
                  />
                ) : null}
              </>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Alerts</Text>
              <View style={styles.alertSelectorRow}>
                {(
                  [
                    { label: 'First alert', selector: 'first', timing: values.firstAlertTiming },
                    { label: 'Second alert', selector: 'second', timing: values.secondAlertTiming },
                  ] as const
                ).map(({ label, selector, timing }) => (
                  <Pressable
                    key={selector}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${label.toLowerCase()} selector`}
                    onPress={() =>
                      setActiveAlertSelector((current) => (current === selector ? null : selector))
                    }
                    style={({ pressed }) => [styles.alertSelector, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.alertSelectorLabel}>{label}</Text>
                    <Text style={styles.alertSelectorValue}>{formatAlertTiming(timing)}</Text>
                  </Pressable>
                ))}
              </View>

              {activeAlertSelector ? (
                <View style={styles.alertOptions}>
                  {ALERT_TIMING_OPTIONS.map((option) => {
                    const activeTiming =
                      activeAlertSelector === 'first'
                        ? values.firstAlertTiming
                        : values.secondAlertTiming;
                    const otherTiming =
                      activeAlertSelector === 'first'
                        ? values.secondAlertTiming
                        : values.firstAlertTiming;
                    const isSelected = activeTiming === option.value;
                    const isUnavailable = option.value !== 'none' && otherTiming === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${
                          activeAlertSelector === 'first' ? 'first' : 'second'
                        } alert ${option.label}`}
                        accessibilityState={{ disabled: isUnavailable, selected: isSelected }}
                        disabled={isUnavailable}
                        onPress={() => handleAlertTimingChange(activeAlertSelector, option.value)}
                        style={({ pressed }) => [
                          styles.alertOption,
                          isSelected ? styles.alertOptionSelected : null,
                          isUnavailable ? styles.alertOptionDisabled : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.alertOptionText,
                            isSelected ? styles.alertOptionTextSelected : null,
                            isUnavailable ? styles.alertOptionTextDisabled : null,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Availability</Text>
              <View style={styles.optionWrap}>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: values.availability === option.value }}
                    onPress={() => updateValue('availability', option.value)}
                    style={[
                      styles.option,
                      values.availability === option.value ? styles.optionSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        values.availability === option.value ? styles.optionTextSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <FormField
              label="URL"
              value={values.url}
              onChangeText={(value) => updateValue('url', value)}
              placeholder="https://"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Event URL"
              labelStyle={styles.compactLabel}
              inputStyle={styles.input}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {cancelSave ? (
          <View style={styles.scopePromptActions}>
            {beforeSave}
            <View style={styles.saveActionRow}>
              <AppButton
                label="Cancel"
                variant="secondary"
                accessibilityLabel={cancelSave.accessibilityLabel}
                onPress={cancelSave.onPress}
                style={styles.saveActionButton}
              />
              <AppButton
                label={saveLabel}
                accessibilityLabel={saveAccessibilityLabel}
                onPress={handleSave}
                disabled={saveDisabled}
                loading={saving}
                loadingLabel="Saving..."
                style={styles.saveActionButton}
              />
            </View>
          </View>
        ) : (
          <>
            {beforeSave}
            <AppButton
              label={saveLabel}
              accessibilityLabel={saveAccessibilityLabel}
              onPress={handleSave}
              disabled={saveDisabled}
              loading={saving}
              loadingLabel="Saving..."
            />
          </>
        )}
      </ScrollView>
      <TimeZoneModal
        visible={timezonePickerVisible}
        selectedValue={values.timezone}
        onClose={() => setTimezonePickerVisible(false)}
        onSelect={(value) => {
          updateValue('timezone', value);
          setTimezonePickerVisible(false);
        }}
      />
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      flexShrink: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.sm,
    },
    scopePromptActions: {
      gap: spacing.sm,
    },
    saveActionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    saveActionButton: {
      flex: 1,
    },
    fieldGroup: {
      gap: spacing.xs,
    },
    fieldLabel: {
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
    input: {
      ...typography.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    inputMultiline: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    textArea: {
      minHeight: 72,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
    },
    switchRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    switchLabelGroup: {
      flex: 1,
      gap: spacing.xs,
      paddingRight: spacing.md,
    },
    helperText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    dateRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    flexField: {
      flex: 1,
      minWidth: 0,
    },
    advancedButton: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
    },
    advancedButtonText: {
      ...typography.button,
      color: theme.colors.brand,
    },
    advancedFields: {
      gap: spacing.md,
    },
    alertSelectorRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    alertSelector: {
      flex: 1,
      minWidth: 0,
      minHeight: 64,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    alertSelectorLabel: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    alertSelectorValue: {
      ...typography.helper,
      color: theme.colors.text,
      fontWeight: '600',
    },
    alertOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceRaised,
      padding: spacing.sm,
    },
    alertOption: {
      minHeight: 40,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    alertOptionSelected: {
      backgroundColor: theme.colors.surfaceBrand,
    },
    alertOptionDisabled: {
      opacity: 0.45,
    },
    alertOptionText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    alertOptionTextSelected: {
      color: theme.colors.brand,
      fontWeight: '700',
    },
    alertOptionTextDisabled: {
      color: theme.colors.textSecondary,
    },
    optionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    weekdayRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    weekdayOption: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
    },
    option: {
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    optionSelected: {
      borderColor: theme.colors.brand,
      backgroundColor: theme.colors.surfaceBrand,
    },
    optionText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    optionTextSelected: {
      color: theme.colors.brand,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.65,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    saveButton: {
      borderRadius: radii.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      backgroundColor: theme.colors.brand,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      ...typography.button,
      color: '#F4F8FA',
    },
  });
