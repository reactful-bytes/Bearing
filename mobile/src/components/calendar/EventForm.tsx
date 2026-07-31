import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
import { CreateEventInput, EventAvailability } from '../../features/calendar/calendarTypes';
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
  saveLabel?: string;
  onSave: (input: CreateEventInput) => Promise<void>;
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
  saveLabel = 'Save Event',
  onSave,
}: EventFormProps) {
  const [values, setValues] = useState<CalendarEventFormValues>(() =>
    buildCalendarEventFormValues(initialDate, initialValues),
  );
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    setValues(buildCalendarEventFormValues(initialDate, initialValues));
    setAdvancedVisible(false);
    setError(null);
    setSaving(false);
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
      await onSave(result.input);
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
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput
          style={styles.input}
          value={values.title}
          onChangeText={(value) => updateValue('title', value)}
          placeholder="Event title"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="sentences"
          returnKeyType="next"
          accessibilityLabel="Event title"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={values.description}
          onChangeText={(value) => updateValue('description', value)}
          placeholder="Add notes"
          placeholderTextColor={colors.textSecondary}
          multiline
          accessibilityLabel="Event description"
        />
      </View>

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
        <View style={[styles.fieldGroup, styles.flexField]}>
          <Text style={styles.fieldLabel}>Start date</Text>
          <TextInput
            style={styles.input}
            value={values.startDate}
            onChangeText={(value) => updateValue('startDate', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Start date"
          />
        </View>
        <View style={[styles.fieldGroup, styles.flexField]}>
          <Text style={styles.fieldLabel}>End date</Text>
          <TextInput
            style={styles.input}
            value={values.endDate}
            onChangeText={(value) => updateValue('endDate', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="End date"
          />
        </View>
      </View>

      {!values.allDay ? (
        <View style={styles.dateRow}>
          <View style={[styles.fieldGroup, styles.flexField]}>
            <Text style={styles.fieldLabel}>Start time</Text>
            <TextInput
              style={styles.input}
              value={values.startTime}
              onChangeText={(value) => updateValue('startTime', value)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Start time"
            />
          </View>
          <View style={[styles.fieldGroup, styles.flexField]}>
            <Text style={styles.fieldLabel}>End time</Text>
            <TextInput
              style={styles.input}
              value={values.endTime}
              onChangeText={(value) => updateValue('endTime', value)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="End time"
            />
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          advancedVisible ? 'Hide advanced event fields' : 'Show advanced event fields'
        }
        onPress={() => setAdvancedVisible((current) => !current)}
        style={({ pressed }) => [styles.advancedButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.advancedButtonText}>
          {advancedVisible ? 'Hide Advanced' : 'Advanced'}
        </Text>
      </Pressable>

      {advancedVisible ? (
        <View style={styles.advancedFields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Timezone</Text>
            <TextInput
              style={styles.input}
              value={values.timezone}
              onChangeText={(value) => updateValue('timezone', value)}
              placeholder="America/New_York"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Event timezone"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={values.location}
              onChangeText={(value) => updateValue('location', value)}
              placeholder="Add a location"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Event location"
            />
          </View>

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
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Repeat interval</Text>
                <TextInput
                  style={styles.input}
                  value={values.recurrenceInterval}
                  onChangeText={(value) => updateValue('recurrenceInterval', value)}
                  keyboardType="number-pad"
                  accessibilityLabel="Recurrence interval"
                />
              </View>
              <View style={styles.dateRow}>
                <View style={[styles.fieldGroup, styles.flexField]}>
                  <Text style={styles.fieldLabel}>End date (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={values.recurrenceEndDate}
                    onChangeText={(value) => updateValue('recurrenceEndDate', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    accessibilityLabel="Recurrence end date"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexField]}>
                  <Text style={styles.fieldLabel}>Occurrences (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={values.recurrenceOccurrenceCount}
                    onChangeText={(value) => updateValue('recurrenceOccurrenceCount', value)}
                    keyboardType="number-pad"
                    accessibilityLabel="Recurrence occurrences"
                  />
                </View>
              </View>
            </>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Alarm offsets (minutes)</Text>
            <TextInput
              style={styles.input}
              value={values.alarmOffsets}
              onChangeText={(value) => updateValue('alarmOffsets', value)}
              placeholder="-30, -10"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Alarm offsets"
            />
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>URL</Text>
            <TextInput
              style={styles.input}
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
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save event"
        accessibilityState={{ disabled: saving }}
        onPress={saving ? undefined : handleSave}
        style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : saveLabel}</Text>
      </Pressable>
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
