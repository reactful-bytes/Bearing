import { describe, expect, it } from '@jest/globals';

import { CalendarEvent } from '../features/calendar/calendarTypes';
import { parseIcsCalendar, serializeEventsToIcs } from '../features/calendar/icsInterop';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    userId: 'user-1',
    title: 'Deep work block',
    description: 'Protect the morning focus block.\nBring notes.',
    startAt: new Date(Date.UTC(2026, 6, 26, 13, 0, 0)),
    endAt: new Date(Date.UTC(2026, 6, 26, 14, 30, 0)),
    timezone: 'America/New_York',
    source: 'local',
    externalEventId: 'bearing-uid-1',
    calendarConnectionId: null,
    goalId: 'goal-1',
    stepId: 'step-1',
    status: 'scheduled',
    createdAt: new Date(Date.UTC(2026, 6, 20, 10, 0, 0)),
    updatedAt: new Date(Date.UTC(2026, 6, 20, 10, 0, 0)),
    ...overrides,
  };
}

describe('icsInterop', () => {
  it('serializes and parses timed events for round-trip export and import', () => {
    const icsContent = serializeEventsToIcs([makeEvent()]);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('SUMMARY:Deep work block');

    const parsed = parseIcsCalendar(icsContent);

    expect(parsed.skippedEntries).toBe(0);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]).toMatchObject({
      uid: 'bearing-uid-1',
      title: 'Deep work block',
      description: 'Protect the morning focus block.\nBring notes.',
      timezone: 'America/New_York',
    });
    expect(parsed.events[0].startAt.toISOString()).toBe('2026-07-26T13:00:00.000Z');
    expect(parsed.events[0].endAt.toISOString()).toBe('2026-07-26T14:30:00.000Z');
  });

  it('skips unsupported recurring and all-day entries', () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:all-day-1',
      'DTSTART;VALUE=DATE:20260726',
      'DTEND;VALUE=DATE:20260727',
      'SUMMARY:All day event',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:recurring-1',
      'DTSTART:20260726T130000Z',
      'DTEND:20260726T140000Z',
      'SUMMARY:Recurring event',
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');

    const parsed = parseIcsCalendar(icsContent);

    expect(parsed.events).toHaveLength(0);
    expect(parsed.skippedEntries).toBe(2);
  });
});