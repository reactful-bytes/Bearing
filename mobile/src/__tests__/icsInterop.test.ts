import { describe, expect, it } from '@jest/globals';

import { CalendarEvent } from '../features/calendar/calendarTypes';
import { serializeEventsToIcs } from '../features/calendar/icsInterop';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    ownership: 'bearing',
    id: 'event-1',
    userId: 'user-1',
    title: 'Deep work block',
    description: 'Protect the morning focus block.\nBring notes.',
    startAt: new Date(Date.UTC(2026, 6, 26, 13, 0, 0)),
    endAt: new Date(Date.UTC(2026, 6, 26, 14, 30, 0)),
    timezone: 'America/New_York',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    goalId: 'goal-1',
    stepId: 'step-1',
    status: 'scheduled',
    createdAt: new Date(Date.UTC(2026, 6, 20, 10, 0, 0)),
    updatedAt: new Date(Date.UTC(2026, 6, 20, 10, 0, 0)),
    ...overrides,
  };
}

describe('icsInterop', () => {
  it('serializes Bearing events with stable IDs and escaped text', () => {
    const icsContent = serializeEventsToIcs([makeEvent()]);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('UID:bearing-event-1');
    expect(icsContent).toContain('SUMMARY:Deep work block');
    expect(icsContent).toContain('DESCRIPTION:Protect the morning focus block.\\nBring notes.');
    expect(icsContent).not.toContain('X-BEARING-SOURCE');
  });

  it('excludes canceled events from export', () => {
    const icsContent = serializeEventsToIcs([makeEvent({ status: 'canceled' })]);

    expect(icsContent).not.toContain('BEGIN:VEVENT');
  });
});
