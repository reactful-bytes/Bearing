import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { FormField } from '../ui/FormField';
import { EventDateTimePickerField } from './EventDateTimePickerField';
import { colors, radii, spacing, typography } from '../../design/tokens';
import {
  CreateEventInput,
  CreateEventOptions,
  EventAvailability,
} from '../../features/calendar/calendarTypes';
import {
  CalendarEventFormValues,
  EventFormRecurrenceFrequency,
  buildCalendarEventFormValues,
  parseCalendarEventForm,
} from '../../features/calendar/eventEditor';
import { DEFAULT_TIME_FORMAT, TimeFormat } from '../../features/profile/timeFormat';

type EventFormProps = {
  active: boolean;
  initialDate: Date;
  initialValues?: Partial<CreateEventInput>;
  publicationCalendarTitle?: string | null;
  locale?: string;
  timeFormat?: TimeFormat;
  saveLabel?: string;
  onSave: (input: CreateEventInput, options: CreateEventOptions) => Promise<void>;
};

const RECURRENCE_OPTIONS: { label: string; value: EventFormRecurrenceFrequency }[] = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

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

export function EventForm({
  active,
  initialDate,
  initialValues,
  publicationCalendarTitle,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  saveLabel = 'Save Event',
  onSave,
}: EventFormProps) {
  const [values, setValues] = useState<CalendarEventFormValues>(() =>
    buildCalendarEventFormValues(initialDate, initialValues),
  );
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishToDevice, setPublishToDevice] = useState(false);
  const [activeAlertSelector, setActiveAlertSelector] = useState<AlertSelector | null>(null);

  useEffect(() => {
    if (!active) return;
    setValues(buildCalendarEventFormValues(initialDate, initialValues));
    setAdvancedVisible(false);
    setError(null);
    setSaving(false);
    setPublishToDevice(false);
    setActiveAlertSelector(null);
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

  async function handleSave(): Promise<void> {
    setError(null);
    const result = parseCalendarEventForm(values, {
      goalId: initialValues?.goalId ?? null,
      stepId: initialValues?.stepId ?? null,
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

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <FormField
        label="Title"
        value={values.title}
        onChangeText={(value) => updateValue('title', value)}
        placeholder="Event title"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="sentences"
        returnKeyType="next"
        accessibilityLabel="Event title"
      />

      <FormField
        label="Description (optional)"
        value={values.description}
        onChangeText={(value) => updateValue('description', value)}
        placeholder="Add notes"
        placeholderTextColor={colors.textSecondary}
        multiline
        accessibilityLabel="Event description"
      />

      <View style={styles.switchRow}>
        <Text style={styles.fieldLabel}>All day</Text>
        <Switch
          value={values.allDay}
          onValueChange={handleAllDayChange}
          trackColor={{ false: colors.border, true: colors.surfaceBrand }}
          thumbColor={values.allDay ? colors.brand : colors.textSecondary}
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
            trackColor={{ false: colors.border, true: colors.surfaceBrand }}
            thumbColor={publishToDevice ? colors.brand : colors.textSecondary}
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
          <FormField
            label="Timezone"
            value={values.timezone}
            onChangeText={(value) => updateValue('timezone', value)}
            placeholder="America/New_York"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Event timezone"
          />

          <FormField
            label="Location"
            value={values.location}
            onChangeText={(value) => updateValue('location', value)}
            placeholder="Add a location"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Event location"
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Repeats</Text>
            <View style={styles.optionWrap}>
              {RECURRENCE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: values.recurrenceFrequency === option.value }}
                  onPress={() => updateValue('recurrenceFrequency', option.value)}
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

          {values.recurrenceFrequency !== 'none' ? (
            <>
              <FormField
                label="Repeat interval"
                value={values.recurrenceInterval}
                onChangeText={(value) => updateValue('recurrenceInterval', value)}
                keyboardType="number-pad"
                accessibilityLabel="Recurrence interval"
              />
              <View style={styles.dateRow}>
                <EventDateTimePickerField
                  label="End date (optional)"
                  containerStyle={styles.flexField}
                  value={values.recurrenceEndDate}
                  accessibilityLabel="Recurrence end date"
                  mode="date"
                  dateValue={values.recurrenceEndDate}
                  fallbackDateValue={values.endDate}
                  timeValue="12:00"
                  timezone={values.timezone}
                  locale={locale}
                  timeFormat={timeFormat}
                  allowClear
                  onChange={(value) => updateValue('recurrenceEndDate', value)}
                />
                <FormField
                  label="Occurrences (optional)"
                  containerStyle={styles.flexField}
                  value={values.recurrenceOccurrenceCount}
                  onChangeText={(value) => updateValue('recurrenceOccurrenceCount', value)}
                  keyboardType="number-pad"
                  accessibilityLabel="Recurrence occurrences"
                />
              </View>
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
            placeholderTextColor={colors.textSecondary}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Event URL"
          />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AppButton
        label={saveLabel}
        accessibilityLabel="Save event"
        onPress={handleSave}
        loading={saving}
        loadingLabel="Saving..."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexShrink: 1,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
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
    color: colors.textSecondary,
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
    color: colors.brand,
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
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  alertSelectorLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  alertSelectorValue: {
    ...typography.helper,
    color: colors.text,
    fontWeight: '600',
  },
  alertOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  alertOption: {
    minHeight: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  alertOptionSelected: {
    backgroundColor: colors.surfaceBrand,
  },
  alertOptionDisabled: {
    opacity: 0.45,
  },
  alertOptionText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  alertOptionTextSelected: {
    color: colors.brand,
    fontWeight: '700',
  },
  alertOptionTextDisabled: {
    color: colors.textSecondary,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceBrand,
  },
  optionText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.brand,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  saveButton: {
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.brand,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.button,
    color: '#F4F8FA',
  },
});
