import { describe, expect, it } from '@jest/globals';

import {
  buildCalendarEventFormValues,
  parseCalendarEventForm,
} from '../features/calendar/eventEditor';

function validValues() {
  return {
    ...buildCalendarEventFormValues(new Date('2026-07-31T09:00:00.000Z')),
    title: 'Planning',
    startDate: '2026-07-31',
    startTime: '09:00',
    endDate: '2026-07-31',
    endTime: '10:00',
    timezone: 'UTC',
  };
}

describe('event editor validation', () => {
  it('preserves wall-clock fields when editing an event from another timezone', () => {
    const values = buildCalendarEventFormValues(new Date('2026-07-31T13:00:00.000Z'), {
      startAt: new Date('2026-07-31T13:00:00.000Z'),
      endAt: new Date('2026-07-31T14:00:00.000Z'),
      timezone: 'America/New_York',
    });

    expect(values).toMatchObject({
      startDate: '2026-07-31',
      startTime: '09:00',
      endTime: '10:00',
      timezone: 'America/New_York',
    });
  });

  it('builds a complete event input from valid advanced values', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      description: 'Weekly review',
      location: 'Office',
      recurrenceFrequency: 'weekly',
      recurrenceInterval: '2',
      recurrenceEndMode: 'count',
      recurrenceOccurrenceCount: '4',
      firstAlertTiming: '-30',
      secondAlertTiming: '0',
      availability: 'tentative',
      url: 'https://example.com/plan',
    });

    expect(result.errors).toEqual([]);
    expect(result.input).toMatchObject({
      title: 'Planning',
      description: 'Weekly review',
      timezone: 'UTC',
      location: 'Office',
      recurrenceRule: {
        frequency: 'weekly',
        interval: 2,
        occurrenceCount: 4,
        weekdays: [],
      },
      alarms: [
        { absoluteAt: null, relativeOffsetMinutes: -30 },
        { absoluteAt: null, relativeOffsetMinutes: 0 },
      ],
      availability: 'tentative',
      url: 'https://example.com/plan',
    });
  });

  it('rejects missing titles, invalid ranges, timezones, alert bounds, and URLs', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      title: ' ',
      endTime: '08:00',
      timezone: 'Not/A_Timezone',
      firstAlertTiming: '-50000',
      url: 'example.com',
    });

    expect(result.input).toBeNull();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Title is required.',
        'Timezone is invalid.',
        'Alert timing must be whole minutes between -40320 and 40320.',
        'URL must start with http:// or https://.',
      ]),
    );
  });

  it('enforces exclusive all-day boundaries', () => {
    const invalid = parseCalendarEventForm({
      ...validValues(),
      allDay: true,
      endDate: '2026-07-31',
    });
    const valid = parseCalendarEventForm({
      ...validValues(),
      allDay: true,
      endDate: '2026-08-01',
    });

    expect(invalid.errors).toContain('All-day end date must be after the start date.');
    expect(valid.input?.startAt.toISOString()).toBe('2026-07-31T00:00:00.000Z');
    expect(valid.input?.endAt.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('rejects nonexistent DST wall times', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      startDate: '2026-03-08',
      startTime: '02:30',
      endDate: '2026-03-08',
      endTime: '03:30',
      timezone: 'America/New_York',
    });

    expect(result.errors).toContain('Start date or time is invalid for this timezone.');
  });

  it('rejects an out-of-range selected recurrence count', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'daily',
      recurrenceInterval: '0',
      recurrenceEndMode: 'count',
      recurrenceOccurrenceCount: '5',
    });

    expect(result.errors).toContain('Recurrence interval must be between 1 and 999.');
  });

  it('defaults new repeat schedules to Forever and serializes no end limit', () => {
    const values = buildCalendarEventFormValues(new Date('2026-07-31T09:00:00.000Z'));
    expect(values.recurrenceEndMode).toBe('forever');

    const result = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'daily',
      recurrenceEndMode: 'forever',
      recurrenceEndDate: '2026-08-31',
      recurrenceOccurrenceCount: '5',
    });

    expect(result.errors).toEqual([]);
    expect(result.input?.recurrenceRule).toEqual({
      frequency: 'daily',
      interval: 1,
      endAt: null,
      occurrenceCount: null,
      weekdays: [],
    });
  });

  it('serializes only the selected count or until condition', () => {
    const countResult = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'daily',
      recurrenceEndMode: 'count',
      recurrenceOccurrenceCount: '10',
      recurrenceEndDate: '2026-08-31',
    });
    const untilResult = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'daily',
      recurrenceEndMode: 'until',
      recurrenceOccurrenceCount: '10',
      recurrenceEndDate: '2026-08-31',
    });

    expect(countResult.input?.recurrenceRule).toMatchObject({
      occurrenceCount: 10,
      endAt: null,
    });
    expect(untilResult.input?.recurrenceRule?.occurrenceCount).toBeNull();
    expect(untilResult.input?.recurrenceRule?.endAt).toEqual(new Date('2026-08-31T23:59:00.000Z'));
  });

  it('requires a count or until date only when that ending mode is selected', () => {
    const missingCount = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'weekly',
      recurrenceEndMode: 'count',
      recurrenceOccurrenceCount: '',
    });
    const missingUntilDate = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'weekly',
      recurrenceEndMode: 'until',
      recurrenceEndDate: '',
    });

    expect(missingCount.errors).toContain('Repeat count must be between 1 and 9999.');
    expect(missingUntilDate.errors).toContain('Choose an end date for this repeat schedule.');
  });

  it('builds and restores custom weekday recurrence', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'custom',
      recurrenceWeekdays: ['monday', 'wednesday', 'saturday'],
    });

    expect(result.errors).toEqual([]);
    expect(result.input?.recurrenceRule).toEqual({
      frequency: 'weekly',
      interval: 1,
      endAt: null,
      occurrenceCount: null,
      weekdays: ['monday', 'wednesday', 'saturday'],
    });

    expect(
      buildCalendarEventFormValues(new Date('2026-07-31T09:00:00.000Z'), result.input ?? undefined),
    ).toMatchObject({
      recurrenceFrequency: 'custom',
      recurrenceWeekdays: ['monday', 'wednesday', 'saturday'],
    });
  });

  it('requires at least one custom recurrence weekday', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'custom',
      recurrenceWeekdays: [],
    });

    expect(result.input).toBeNull();
    expect(result.errors).toContain('Choose at least one day for custom recurrence.');
  });
});
