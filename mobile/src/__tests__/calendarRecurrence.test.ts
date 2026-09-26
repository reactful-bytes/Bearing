import { describe, expect, it } from '@jest/globals';

import { expandCalendarEventsForRange } from '../features/calendar/calendarRecurrence';
import { BearingEvent, createUnpublishedMetadata } from '../features/calendar/calendarTypes';

function makeEvent(startAt: Date, recurrenceRule: BearingEvent['recurrenceRule']): BearingEvent {
  return {
    ownership: 'bearing',
    id: 'recurring-event',
    userId: 'user-1',
    title: 'Recurring event',
    description: '',
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule,
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

describe('expandCalendarEventsForRange', () => {
  it('expands a custom Monday, Wednesday, Friday series and honors its occurrence limit', () => {
    const event = makeEvent(new Date('2026-09-28T09:00:00.000Z'), {
      frequency: 'weekly',
      interval: 1,
      endAt: null,
      occurrenceCount: 3,
      weekdays: ['monday', 'wednesday', 'friday'],
    });

    const occurrences = expandCalendarEventsForRange(
      [event],
      new Date('2026-09-28T00:00:00.000Z'),
      new Date('2026-10-04T23:59:59.999Z'),
    );

    expect(occurrences.map(({ startAt }) => startAt.toISOString())).toEqual([
      '2026-09-28T09:00:00.000Z',
      '2026-09-30T09:00:00.000Z',
      '2026-10-02T09:00:00.000Z',
    ]);
  });

  it('shows future instances when the recurrence master starts before the visible month', () => {
    const event = makeEvent(new Date('2026-08-01T09:00:00.000Z'), {
      frequency: 'daily',
      interval: 2,
      endAt: null,
      occurrenceCount: null,
      weekdays: [],
    });

    const occurrences = expandCalendarEventsForRange(
      [event],
      new Date('2026-08-30T00:00:00.000Z'),
      new Date('2026-09-04T23:59:59.999Z'),
    );

    expect(occurrences.map(({ startAt }) => startAt.toISOString())).toEqual([
      '2026-08-31T09:00:00.000Z',
      '2026-09-02T09:00:00.000Z',
      '2026-09-04T09:00:00.000Z',
    ]);
  });

  it('omits locally excluded recurrence instances without hiding the rest of the series', () => {
    const event = {
      ...makeEvent(new Date('2026-09-28T09:00:00.000Z'), {
        frequency: 'weekly' as const,
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: ['monday', 'wednesday', 'friday'] as const,
      }),
      excludedOccurrenceDates: ['2026-09-30'],
    };

    const occurrences = expandCalendarEventsForRange(
      [event],
      new Date('2026-09-28T00:00:00.000Z'),
      new Date('2026-10-04T23:59:59.999Z'),
    );

    expect(occurrences.map(({ startAt }) => startAt.toISOString())).toEqual([
      '2026-09-28T09:00:00.000Z',
      '2026-10-02T09:00:00.000Z',
    ]);
  });

  it('projects edited and moved occurrences while retaining their original schedule identity', () => {
    const event = {
      ...makeEvent(new Date('2026-08-03T09:00:00.000Z'), {
        frequency: 'daily' as const,
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: [],
      }),
      recurrenceOverrides: {
        '2026-08-03': {
          title: 'Moved planning',
          startAt: new Date('2026-08-05T11:00:00.000Z'),
          endAt: new Date('2026-08-05T12:00:00.000Z'),
        },
      },
    };

    const occurrences = expandCalendarEventsForRange(
      [event],
      new Date('2026-08-05T00:00:00.000Z'),
      new Date('2026-08-05T23:59:59.999Z'),
    );

    expect(occurrences).toHaveLength(2);
    expect(occurrences[1]).toMatchObject({
      title: 'Moved planning',
      recurrenceInstanceDate: '2026-08-03',
      startAt: new Date('2026-08-05T11:00:00.000Z'),
      endAt: new Date('2026-08-05T12:00:00.000Z'),
    });
    expect(occurrences[0].startAt).toEqual(new Date('2026-08-05T09:00:00.000Z'));
  });
});
