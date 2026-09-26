import { describe, expect, it } from '@jest/globals';

import { decodeCalendarEventData } from '../features/calendar/calendarEventDecoder';

function timestamp(value: Date): { toDate: () => Date } {
  return { toDate: () => value };
}

describe('firebaseEvents legacy decoding', () => {
  it('ignores provider-only fields while preserving imported event content', () => {
    const startAt = new Date(2026, 6, 31, 9);
    const endAt = new Date(2026, 6, 31, 10);
    const decoded = decodeCalendarEventData('legacy-import', {
      userId: 'user-1',
      title: 'Imported planning block',
      description: 'Retained after provider retirement.',
      startAt: timestamp(startAt),
      endAt: timestamp(endAt),
      timezone: 'America/New_York',
      source: 'ics_import',
      externalEventId: 'old-ics-uid',
      calendarConnectionId: 'old-connection',
      goalId: null,
      milestoneId: null,
      status: 'scheduled',
      createdAt: timestamp(startAt),
      updatedAt: timestamp(startAt),
    });

    expect(decoded).toMatchObject({
      id: 'legacy-import',
      title: 'Imported planning block',
      startAt,
      endAt,
      status: 'scheduled',
      sourceTaskId: null,
    });
    expect(decoded).not.toHaveProperty('source');
    expect(decoded).not.toHaveProperty('externalEventId');
    expect(decoded).not.toHaveProperty('calendarConnectionId');
    expect(decoded.publication).toEqual({
      status: 'unpublished',
      markerId: null,
      commonHash: null,
      lastError: null,
      retryable: false,
      deletionIntent: false,
    });
    expect(decoded.sourceTaskId).toBeNull();
  });

  it('decodes nullable task provenance without inferring it from event IDs', () => {
    const at = new Date(2026, 6, 31, 9);
    const decoded = decodeCalendarEventData('event-task-42', {
      userId: 'user-1',
      title: 'Task block',
      description: '',
      startAt: timestamp(at),
      endAt: timestamp(new Date(2026, 6, 31, 10)),
      timezone: 'UTC',
      sourceTaskId: 'task-42',
      status: 'scheduled',
      createdAt: timestamp(at),
      updatedAt: timestamp(at),
    });

    expect(decoded.sourceTaskId).toBe('task-42');
  });

  it('decodes publication state without accepting native identifiers', () => {
    const at = new Date(2026, 6, 31, 9);
    const decoded = decodeCalendarEventData('published-event', {
      userId: 'user-1',
      title: 'Published',
      description: '',
      startAt: timestamp(at),
      endAt: timestamp(new Date(2026, 6, 31, 10)),
      timezone: 'UTC',
      status: 'scheduled',
      publication: {
        status: 'failed',
        markerId: 'opaque-marker',
        commonHash: 'h1-0123456789abcdef',
        lastError: 'Retry publication.',
        retryable: true,
        deletionIntent: false,
        nativeEventId: 'must-not-decode',
      },
      createdAt: timestamp(at),
      updatedAt: timestamp(at),
    });

    expect(decoded.publication).toEqual({
      status: 'failed',
      markerId: 'opaque-marker',
      commonHash: 'h1-0123456789abcdef',
      lastError: 'Retry publication.',
      retryable: true,
      deletionIntent: false,
    });
    expect(decoded.publication).not.toHaveProperty('nativeEventId');
  });

  it('decodes valid custom weekdays in calendar order', () => {
    const at = new Date(2026, 7, 3, 9);
    const decoded = decodeCalendarEventData('custom-recurrence', {
      userId: 'user-1',
      title: 'Custom recurrence',
      description: '',
      startAt: timestamp(at),
      endAt: timestamp(new Date(2026, 7, 3, 10)),
      timezone: 'UTC',
      recurrenceRule: {
        frequency: 'weekly',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: ['saturday', 'invalid', 'monday', 'monday'],
      },
      status: 'scheduled',
      createdAt: timestamp(at),
      updatedAt: timestamp(at),
    });

    expect(decoded.recurrenceRule?.weekdays).toEqual(['monday', 'saturday']);
  });

  it('decodes distinct valid excluded recurrence dates', () => {
    const at = new Date(2026, 7, 3, 9);
    const decoded = decodeCalendarEventData('excluded-recurrence', {
      userId: 'user-1',
      title: 'Excluded recurrence',
      description: '',
      startAt: timestamp(at),
      endAt: timestamp(new Date(2026, 7, 3, 10)),
      timezone: 'UTC',
      recurrenceRule: {
        frequency: 'daily',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: [],
      },
      excludedOccurrenceDates: ['2026-08-04', 'invalid', '2026-08-04'],
      status: 'scheduled',
      createdAt: timestamp(at),
      updatedAt: timestamp(at),
    });

    expect(decoded.excludedOccurrenceDates).toEqual(['2026-08-04']);
  });

  it('decodes valid per-occurrence overrides and ignores invalid date keys', () => {
    const at = new Date(2026, 7, 3, 9);
    const movedStart = new Date(2026, 7, 5, 11);
    const movedEnd = new Date(2026, 7, 5, 12);
    const decoded = decodeCalendarEventData('override-recurrence', {
      userId: 'user-1',
      title: 'Recurring',
      description: '',
      startAt: timestamp(at),
      endAt: timestamp(new Date(2026, 7, 3, 10)),
      timezone: 'UTC',
      recurrenceRule: {
        frequency: 'daily',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: [],
      },
      recurrenceOverrides: {
        '2026-08-03': {
          title: 'Moved',
          startAt: timestamp(movedStart),
          endAt: timestamp(movedEnd),
        },
        invalid: { title: 'Ignored' },
      },
      status: 'scheduled',
      createdAt: timestamp(at),
      updatedAt: timestamp(at),
    });

    expect(decoded.recurrenceOverrides).toEqual({
      '2026-08-03': { title: 'Moved', startAt: movedStart, endAt: movedEnd },
    });
  });
});
