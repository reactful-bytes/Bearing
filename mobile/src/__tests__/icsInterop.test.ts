import { describe, expect, it } from '@jest/globals';

import {
  CalendarEvent,
  DeviceCalendarEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
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
    publication: overrides.publication ?? createUnpublishedMetadata(),
  };
}

function makeDeviceEvent(): DeviceCalendarEvent {
  const event = makeEvent();
  return {
    ownership: 'device',
    id: 'device:work:native-1',
    nativeEventId: 'native-1',
    calendarId: 'work',
    calendarTitle: 'Work',
    calendarColor: '#4477aa',
    sourceLabel: 'Device account',
    allowsModifications: true,
    title: event.title,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    allDay: event.allDay,
    location: event.location,
    recurrenceRule: event.recurrenceRule,
    alarms: event.alarms,
    availability: event.availability,
    url: event.url,
    status: event.status,
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

  it('serializes local timed recurrence, location, URL, availability, and alarms', () => {
    const icsContent = serializeEventsToIcs([
      makeEvent({
        title: 'Plan, review; repeat',
        description: 'Bring \\ notes\r\nand decisions.',
        startAt: new Date('2026-03-08T13:30:00.000Z'),
        endAt: new Date('2026-03-08T14:30:00.000Z'),
        location: 'Room 1, East',
        recurrenceRule: {
          frequency: 'weekly',
          interval: 2,
          endAt: null,
          occurrenceCount: 4,
          weekdays: ['monday', 'wednesday', 'saturday'],
        },
        alarms: [{ absoluteAt: null, relativeOffsetMinutes: -15 }],
        availability: 'free',
        url: 'https://example.com/planning',
      }),
    ]);

    expect(icsContent).toContain('DTSTART;TZID=America/New_York:20260308T093000');
    expect(icsContent).toContain('DTEND;TZID=America/New_York:20260308T103000');
    expect(icsContent).toContain('SUMMARY:Plan\\, review\\; repeat');
    expect(icsContent).toContain('DESCRIPTION:Bring \\\\ notes\\nand decisions.');
    expect(icsContent).toContain('LOCATION:Room 1\\, East');
    expect(icsContent).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,SA;COUNT=4');
    expect(icsContent).toContain('TRANSP:TRANSPARENT');
    expect(icsContent).toContain('URL:https://example.com/planning');
    expect(icsContent).toContain('BEGIN:VALARM\r\nACTION:DISPLAY');
    expect(icsContent).toContain('TRIGGER:-PT15M');
  });

  it('serializes all-day dates with an exclusive end and recurrence end', () => {
    const icsContent = serializeEventsToIcs([
      makeEvent({
        allDay: true,
        startAt: new Date('2026-07-04T04:00:00.000Z'),
        endAt: new Date('2026-07-06T04:00:00.000Z'),
        recurrenceRule: {
          frequency: 'yearly',
          interval: 1,
          endAt: new Date('2028-07-05T03:59:00.000Z'),
          occurrenceCount: null,
          weekdays: [],
        },
        alarms: [{ absoluteAt: new Date('2026-07-03T13:00:00.000Z'), relativeOffsetMinutes: null }],
      }),
    ]);

    expect(icsContent).toContain('DTSTART;VALUE=DATE:20260704');
    expect(icsContent).toContain('DTEND;VALUE=DATE:20260706');
    expect(icsContent).toContain('RRULE:FREQ=YEARLY;INTERVAL=1;UNTIL=20280704');
    expect(icsContent).toContain('TRIGGER;VALUE=DATE-TIME:20260703T130000Z');
  });

  it('excludes device events even when passed a merged display list', () => {
    const icsContent = serializeEventsToIcs([makeEvent(), makeDeviceEvent()]);

    expect(icsContent.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('folds every physical content line to at most 75 UTF-8 octets', () => {
    const icsContent = serializeEventsToIcs([
      makeEvent({ title: `Roadmap ${'é'.repeat(50)} ${'planning '.repeat(8)}` }),
    ]);
    const encoder = new TextEncoder();
    const physicalLines = icsContent.split('\r\n').filter(Boolean);

    expect(physicalLines.some((line) => line.startsWith(' '))).toBe(true);
    expect(physicalLines.every((line) => encoder.encode(line).length <= 75)).toBe(true);
  });
});
