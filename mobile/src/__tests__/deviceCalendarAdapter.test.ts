import { describe, expect, it, jest } from '@jest/globals';

import { CreateEventInput } from '../features/calendar/calendarTypes';
import {
  CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE,
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
    const input: CreateEventInput = {
      title: 'Planning',
      description: 'Weekly planning',
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
        weekdays: [],
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

  it('maps custom weekdays on iOS and rejects them on Android before native access', async () => {
    const module = makeModule();
    const input: CreateEventInput = {
      title: 'Custom planning',
      description: '',
      startAt: new Date(2026, 7, 3, 9),
      endAt: new Date(2026, 7, 3, 10),
      timezone: 'UTC',
      recurrenceRule: {
        frequency: 'weekly' as const,
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: ['monday', 'wednesday', 'saturday'],
      },
    };
    const iosAdapter = createDeviceCalendarAdapter(async () => module, 'ios');

    await iosAdapter.createEvent('calendar-1', input);
    const calendar = await module.ExpoCalendar.get('calendar-1');
    expect(calendar.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrenceRule: expect.objectContaining({
          daysOfTheWeek: [{ dayOfTheWeek: 2 }, { dayOfTheWeek: 4 }, { dayOfTheWeek: 7 }],
        }),
      }),
    );

    const androidModuleLoader = jest.fn(async () => makeModule());
    const androidAdapter = createDeviceCalendarAdapter(androidModuleLoader, 'android');
    await expect(androidAdapter.createEvent('calendar-1', input)).rejects.toThrow(
      CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE,
    );
    expect(androidModuleLoader).not.toHaveBeenCalled();
  });

  it('distinguishes found, confirmed missing, and unavailable event lookups', async () => {
    const foundModule = makeModule();
    const foundAdapter = createDeviceCalendarAdapter(async () => foundModule, 'ios');
    await expect(foundAdapter.lookupEvent('event-1')).resolves.toMatchObject({
      status: 'found',
      event: { id: 'event-1' },
    });

    const missingAdapter = createDeviceCalendarAdapter(
      async () =>
        makeModule({
          ExpoCalendarEvent: {
            get: jest.fn(async () => {
              throw new Error('Event does not exist');
            }),
          },
        }),
      'android',
    );
    await expect(missingAdapter.lookupEvent('removed')).resolves.toEqual({ status: 'missing' });

    const unavailableAdapter = createDeviceCalendarAdapter(async () => {
      throw new Error('Permission revoked');
    }, 'android');
    await expect(unavailableAdapter.lookupEvent('event-1')).resolves.toMatchObject({
      status: 'unavailable',
      error: expect.objectContaining({ message: 'Permission revoked' }),
    });
  });
});
