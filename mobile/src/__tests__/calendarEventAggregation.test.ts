import { describe, expect, it } from '@jest/globals';

import {
  mergeCalendarEvents,
  normalizeDeviceCalendarEvents,
} from '../features/calendar/calendarEventAggregation';
import { BearingEvent, DeviceCalendarEvent } from '../features/calendar/calendarTypes';

const startAt = new Date('2026-07-31T13:00:00.000Z');
const endAt = new Date('2026-07-31T14:00:00.000Z');

function makeBearingEvent(overrides: Partial<BearingEvent> = {}): BearingEvent {
  return {
    ownership: 'bearing',
    id: 'bearing-1',
    userId: 'user-1',
    title: 'Planning',
    description: '',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    createdAt: startAt,
    updatedAt: startAt,
    ...overrides,
  };
}

function makeDeviceEvent(overrides: Partial<DeviceCalendarEvent> = {}): DeviceCalendarEvent {
  return {
    ownership: 'device',
    id: 'device:calendar-1:native-1',
    nativeEventId: 'native-1',
    calendarId: 'calendar-1',
    calendarTitle: 'Work',
    calendarColor: '#123456',
    sourceLabel: 'Device',
    allowsModifications: true,
    title: 'Planning',
    description: '',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    status: 'scheduled',
    ...overrides,
  };
}

describe('mergeCalendarEvents', () => {
  it('adds calendar presentation and capability metadata to native records', () => {
    const [normalized] = normalizeDeviceCalendarEvents(
      [
        {
          id: 'native/1',
          calendarId: 'work/primary',
          title: 'Device planning',
          notes: 'Bring notes',
          startDate: startAt,
          endDate: endAt,
          allDay: false,
          location: 'Studio',
          timeZone: 'America/New_York',
          url: null,
          alarms: [],
          recurrenceRule: null,
          availability: 'busy',
          status: 'scheduled',
        },
      ],
      [
        {
          id: 'work/primary',
          title: 'Work',
          color: '#123456',
          sourceLabel: 'Device account',
          isVisible: true,
          isPrimary: true,
          isSynced: true,
          accessLevel: 'owner',
          allowsModifications: true,
        },
      ],
    );

    expect(normalized).toMatchObject({
      ownership: 'device',
      id: 'device:work%2Fprimary:native%2F1',
      calendarTitle: 'Work',
      calendarColor: '#123456',
      allowsModifications: true,
    });
  });

  it('suppresses only exact linked copies and keeps unrelated matching events', () => {
    const linked = makeDeviceEvent();
    const unrelated = makeDeviceEvent({
      id: 'device:calendar-2:native-2',
      nativeEventId: 'native-2',
      calendarId: 'calendar-2',
    });

    const merged = mergeCalendarEvents([makeBearingEvent()], [linked, unrelated], {
      'bearing-1': {
        calendarId: 'calendar-1',
        eventId: 'native-1',
        updatedAt: startAt.toISOString(),
      },
    });

    expect(merged.map((event) => event.id)).toEqual(['bearing-1', 'device:calendar-2:native-2']);
  });

  it('sorts deterministically by start, end, and stable display ID', () => {
    const merged = mergeCalendarEvents(
      [makeBearingEvent({ id: 'bearing-z', startAt: new Date(startAt.getTime() + 60_000) })],
      [makeDeviceEvent({ id: 'device-a' })],
      {},
    );

    expect(merged.map((event) => event.id)).toEqual(['device-a', 'bearing-z']);
  });
});
