import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { FormField } from '../ui/FormField';
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

type EventFormProps = {
  active: boolean;
  initialDate: Date;
  initialValues?: Partial<CreateEventInput>;
  publicationCalendarTitle?: string | null;
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

function nextDate(dateValue: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return date.toISOString().slice(0, 10);
}

export function EventForm({
  active,
  initialDate,
  initialValues,
  publicationCalendarTitle,
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

  useEffect(() => {
    if (!active) return;
    setValues(buildCalendarEventFormValues(initialDate, initialValues));
    setAdvancedVisible(false);
    setError(null);
    setSaving(false);
    setPublishToDevice(false);
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
        <FormField
          label="Start date"
          containerStyle={styles.flexField}
          value={values.startDate}
          onChangeText={(value) => updateValue('startDate', value)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Start date"
        />
        <FormField
          label="End date"
          containerStyle={styles.flexField}
          value={values.endDate}
          onChangeText={(value) => updateValue('endDate', value)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="End date"
        />
      </View>

      {!values.allDay ? (
        <View style={styles.dateRow}>
          <FormField
            label="Start time"
            containerStyle={styles.flexField}
            value={values.startTime}
            onChangeText={(value) => updateValue('startTime', value)}
            placeholder="HH:MM"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Start time"
          />
          <FormField
            label="End time"
            containerStyle={styles.flexField}
            value={values.endTime}
            onChangeText={(value) => updateValue('endTime', value)}
            placeholder="HH:MM"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="End time"
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
                <FormField
                  label="End date (optional)"
                  containerStyle={styles.flexField}
                  value={values.recurrenceEndDate}
                  onChangeText={(value) => updateValue('recurrenceEndDate', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="Recurrence end date"
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

          <FormField
            label="Alarm offsets (minutes)"
            value={values.alarmOffsets}
            onChangeText={(value) => updateValue('alarmOffsets', value)}
            placeholder="-30, -10"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Alarm offsets"
          />

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
