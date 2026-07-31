import { describe, expect, it, jest } from '@jest/globals';

import {
  DeviceCalendarModule,
  createDeviceCalendarAdapter,
} from '../services/calendar/deviceCalendarAdapter';

function makeModule(overrides: Partial<DeviceCalendarModule> = {}): DeviceCalendarModule {
  const nativeEvent = {
    id: 'event-1',
    calendarId: 'calendar-1',
    title: 'Planning',
    notes: '',
    startDate: new Date(2026, 6, 31, 9),
    endDate: new Date(2026, 6, 31, 10),
    allDay: false,
    location: null,
    timeZone: 'America/New_York',
    url: 'https://example.com/plan',
    alarms: [{ relativeOffset: -15 }],
    recurrenceRule: { frequency: 'weekly', interval: 2, occurrence: 4 },
    availability: 'tentative',
    status: 'confirmed',
    update: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  };
  const nativeCalendar = {
    id: 'calendar-1',
    title: 'Work',
    color: '#123456',
    source: { name: 'Cloud account' },
    isVisible: true,
    isPrimary: true,
    isSynced: true,
    accessLevel: 'owner',
    allowsModifications: true,
    createEvent: jest.fn(async () => nativeEvent),
  };

  return {
    EntityTypes: { EVENT: 'event' },
    ExpoCalendar: { get: jest.fn(async () => nativeCalendar) },
    ExpoCalendarEvent: { get: jest.fn(async () => nativeEvent) },
    getCalendarPermissions: jest.fn(async () => ({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    })),
    requestCalendarPermissions: jest.fn(async () => ({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    })),
    getCalendars: jest.fn(async () => [nativeCalendar]),
    listEvents: jest.fn(async () => [nativeEvent]),
    ...overrides,
  };
}

describe('deviceCalendarAdapter', () => {
  it('returns unavailable without loading the native module on unsupported platforms', async () => {
    const loadModule = jest.fn(async () => makeModule());
    const adapter = createDeviceCalendarAdapter(loadModule, 'web');

    await expect(adapter.getPermissionState()).resolves.toBe('unavailable');
    expect(loadModule).not.toHaveBeenCalled();
  });

  it('normalizes blocked permission and discovered calendar capabilities', async () => {
    const module = makeModule({
      getCalendarPermissions: jest.fn(async () => ({
        status: 'denied',
        granted: false,
        canAskAgain: false,
      })),
    });
    const adapter = createDeviceCalendarAdapter(async () => module, 'ios');

    await expect(adapter.getPermissionState()).resolves.toBe('blocked');
    await expect(adapter.getCalendars()).resolves.toEqual([
      {
        id: 'calendar-1',
        title: 'Work',
        color: '#123456',
        sourceLabel: 'Cloud account',
        isVisible: true,
        isPrimary: true,
        isSynced: true,
        accessLevel: 'owner',
        allowsModifications: true,
      },
    ]);
  });

  it('uses calendar and event object methods for mutations', async () => {
    const module = makeModule();
    const adapter = createDeviceCalendarAdapter(async () => module, 'android');
    const input = {
      title: 'Planning',
      description: 'Weekly planning',
      startDate: new Date(2026, 6, 31, 9),
      endDate: new Date(2026, 6, 31, 10),
      startAt: new Date(2026, 6, 31, 9),
      endAt: new Date(2026, 6, 31, 10),
      timezone: 'America/New_York',
      allDay: false,
      location: 'Office',
      recurrenceRule: {
        frequency: 'weekly' as const,
        interval: 2,
        endAt: null,
        occurrenceCount: 4,
      },
      alarms: [{ absoluteAt: null, relativeOffsetMinutes: -15 }],
      availability: 'tentative' as const,
      url: 'https://example.com/plan',
    };

    await expect(adapter.createEvent('calendar-1', input)).resolves.toMatchObject({
      id: 'event-1',
    });
    await adapter.updateEvent('event-1', { title: 'Updated' });
    await adapter.deleteEvent('event-1');

    expect(module.ExpoCalendar.get).toHaveBeenCalledWith('calendar-1');
    expect(module.ExpoCalendarEvent.get).toHaveBeenCalledTimes(2);
    const calendar = await module.ExpoCalendar.get('calendar-1');
    expect(calendar.createEvent).toHaveBeenCalledWith({
      title: 'Planning',
      notes: 'Weekly planning',
      startDate: input.startAt,
      endDate: input.endAt,
      allDay: false,
      timeZone: 'America/New_York',
      location: 'Office',
      recurrenceRule: {
        frequency: 'weekly',
        interval: 2,
        occurrence: 4,
      },
      alarms: [{ relativeOffset: -15 }],
      availability: 'tentative',
      url: 'https://example.com/plan',
    });
    expect(adapter.capabilities.recurringEventMutationScopes).toEqual([]);
  });
});
