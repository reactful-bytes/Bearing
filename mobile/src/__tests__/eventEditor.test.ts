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

  it('rejects conflicting or out-of-range recurrence limits', () => {
    const result = parseCalendarEventForm({
      ...validValues(),
      recurrenceFrequency: 'daily',
      recurrenceInterval: '0',
      recurrenceEndDate: '2026-08-31',
      recurrenceOccurrenceCount: '5',
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Recurrence interval must be between 1 and 999.',
        'Choose either a recurrence end date or occurrence count, not both.',
      ]),
    );
  });
});
