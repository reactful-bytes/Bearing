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
      stepId: null,
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
    });
    expect(decoded).not.toHaveProperty('source');
    expect(decoded).not.toHaveProperty('externalEventId');
    expect(decoded).not.toHaveProperty('calendarConnectionId');
  });
});
