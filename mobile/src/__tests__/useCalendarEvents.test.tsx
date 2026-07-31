import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  BearingEvent,
  DeviceCalendarEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { useDeviceCalendars } from '../features/calendar/useDeviceCalendars';
import { DeviceCalendarAdapter } from '../services/calendar/deviceCalendarAdapter';
import {
  loadDeviceCalendarSettings,
  subscribeDeviceCalendarSettings,
} from '../services/calendar/deviceCalendarSettings';
import {
  deleteEvent as deleteFirebaseEvent,
  subscribeToEventsByDateRange,
  updateEvent as updateFirebaseEvent,
} from '../services/firebase/firebaseEvents';

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'user-1' } })),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  subscribeToEventsByDateRange: jest.fn(),
  createEvent: jest.fn(async () => 'bearing-new'),
  updateEvent: jest.fn(async () => undefined),
  deleteEvent: jest.fn(async () => undefined),
}));

jest.mock('../services/calendar/deviceCalendarSettings', () => ({
  loadDeviceCalendarSettings: jest.fn(async () => ({
    selectedCalendarIds: ['work'],
    defaultCalendarId: null,
    linkCache: {},
  })),
  subscribeDeviceCalendarSettings: jest.fn(() => jest.fn()),
}));

jest.mock('../features/calendar/useDeviceCalendars', () => ({
  useDeviceCalendars: jest.fn(),
}));

const startAt = new Date('2026-07-31T13:00:00.000Z');
const endAt = new Date('2026-07-31T14:00:00.000Z');

function makeBearingEvent(): BearingEvent {
  return {
    ownership: 'bearing',
    id: 'bearing-1',
    userId: 'user-1',
    title: 'Bearing planning',
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
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

function makeAdapter(listEvents: DeviceCalendarAdapter['listEvents']): DeviceCalendarAdapter {
  return {
    capabilities: { recurringEventMutationScopes: [] },
    getPermissionState: jest.fn(async (): Promise<'granted'> => 'granted'),
    requestPermission: jest.fn(async (): Promise<'granted'> => 'granted'),
    getCalendars: jest.fn(async () => []),
    listEvents,
    createEvent: jest.fn(async () => nativeRecord('Created event')),
    lookupEvent: jest.fn(async () => ({ status: 'missing' as const })),
    updateEvent: jest.fn(async () => undefined),
    deleteEvent: jest.fn(async () => undefined),
    openSettings: jest.fn(async () => undefined),
  };
}

function nativeRecord(title: string, date: Date = startAt) {
  return {
    id: title.toLowerCase().replace(/\s/g, '-'),
    calendarId: 'work',
    title,
    notes: '',
    startDate: date,
    endDate: new Date(date.getTime() + 3_600_000),
    allDay: false,
    location: '',
    timeZone: 'UTC',
    url: null,
    alarms: [],
    recurrenceRule: null,
    availability: 'busy' as const,
    status: 'scheduled' as const,
  };
}

describe('useCalendarEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDeviceCalendars as jest.MockedFunction<typeof useDeviceCalendars>).mockReturnValue({
      calendars: [
        {
          id: 'work',
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
      permission: 'granted',
      selectedCalendarIds: ['work'],
      defaultCalendarId: null,
      uiState: 'ready',
      error: null,
      staleSelectionRecovered: false,
      requestPermission: jest.fn(async () => undefined),
      refresh: jest.fn(async () => undefined),
      toggleCalendar: jest.fn(async () => undefined),
      setDefaultCalendar: jest.fn(async () => undefined),
      openSettings: jest.fn(async () => undefined),
    });
    (
      subscribeToEventsByDateRange as jest.MockedFunction<typeof subscribeToEventsByDateRange>
    ).mockImplementation((_userId, _start, _end, onNext) => {
      onNext([makeBearingEvent()]);
      return jest.fn();
    });
    (
      loadDeviceCalendarSettings as jest.MockedFunction<typeof loadDeviceCalendarSettings>
    ).mockResolvedValue({ selectedCalendarIds: ['work'], defaultCalendarId: null, linkCache: {} });
  });

  it('merges live device events while keeping Firestore usable after native failure', async () => {
    const adapter = makeAdapter(
      jest
        .fn<DeviceCalendarAdapter['listEvents']>()
        .mockResolvedValueOnce([nativeRecord('Device planning')])
        .mockRejectedValueOnce(new Error('Permission revoked')),
    );
    const { result } = renderHook(() => useCalendarEvents(new Date(2026, 6, 31), adapter));

    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(result.current.events.map((event) => event.ownership)).toEqual(['bearing', 'device']);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.events.map((event) => event.id)).toEqual(['bearing-1']);
    expect(result.current.uiState).toBe('ready');
    expect(result.current.deviceError?.message).toBe('Permission revoked');
  });

  it('re-subscribes to Firestore when refresh follows a listener error', async () => {
    const unsubscribeFirst = jest.fn();
    let reportError: ((error: Error) => void) | null = null;
    const mockedSubscribe = subscribeToEventsByDateRange as jest.MockedFunction<
      typeof subscribeToEventsByDateRange
    >;
    mockedSubscribe
      .mockImplementationOnce((_userId, _start, _end, _onNext, onError) => {
        reportError = onError;
        return unsubscribeFirst;
      })
      .mockImplementationOnce((_userId, _start, _end, onNext) => {
        onNext([]);
        return jest.fn();
      });
    const adapter = makeAdapter(jest.fn(async () => []));
    const { result } = renderHook(() => useCalendarEvents(new Date(2026, 6, 31), adapter));

    act(() => reportError?.(new Error('Network unavailable.')));
    expect(result.current.uiState).toBe('error');

    await act(async () => result.current.refresh());
    await waitFor(() => expect(mockedSubscribe).toHaveBeenCalledTimes(2));

    expect(unsubscribeFirst).toHaveBeenCalledTimes(1);
    expect(result.current.uiState).toBe('empty');
  });

  it('ignores stale native results after the visible month changes', async () => {
    let resolveJuly: ((value: ReturnType<typeof nativeRecord>[]) => void) | undefined;
    const july = new Promise<ReturnType<typeof nativeRecord>[]>((resolve) => {
      resolveJuly = resolve;
    });
    const augustStart = new Date('2026-08-03T13:00:00.000Z');
    const adapter = makeAdapter(
      jest
        .fn<DeviceCalendarAdapter['listEvents']>()
        .mockReturnValueOnce(july)
        .mockResolvedValueOnce([nativeRecord('August event', augustStart)]),
    );
    const { result, rerender } = renderHook(
      ({ date }: { date: Date }) => useCalendarEvents(date, adapter),
      { initialProps: { date: new Date(2026, 6, 31) } },
    );

    rerender({ date: new Date(2026, 7, 3) });
    await waitFor(() =>
      expect(result.current.events.some((event) => event.title === 'August event')).toBe(true),
    );

    await act(async () => {
      resolveJuly?.([nativeRecord('Stale July event')]);
      await july;
    });

    expect(result.current.events.some((event) => event.title === 'Stale July event')).toBe(false);
  });

  it('refreshes calendar discovery when this account preferences change', async () => {
    const refreshCalendars = jest.fn(async () => undefined);
    const adapter = makeAdapter(jest.fn(async () => []));
    const mockedUseDeviceCalendars = useDeviceCalendars as jest.MockedFunction<
      typeof useDeviceCalendars
    >;
    const current = mockedUseDeviceCalendars('user-1', adapter);
    mockedUseDeviceCalendars.mockReturnValue({
      ...current,
      refresh: refreshCalendars,
    });
    renderHook(() => useCalendarEvents(new Date(2026, 6, 31), adapter));

    await waitFor(() =>
      expect(subscribeDeviceCalendarSettings).toHaveBeenCalledWith('user-1', expect.any(Function)),
    );
    const listener = (
      subscribeDeviceCalendarSettings as jest.MockedFunction<typeof subscribeDeviceCalendarSettings>
    ).mock.calls[0][1];

    act(() => listener());
    expect(refreshCalendars).toHaveBeenCalledTimes(1);
  });

  it('routes mutations by ownership and always uses nativeEventId for device events', async () => {
    const adapter = makeAdapter(jest.fn(async () => [nativeRecord('Device planning')]));
    const { result } = renderHook(() => useCalendarEvents(new Date(2026, 6, 31), adapter));

    await waitFor(() => expect(result.current.events).toHaveLength(2));
    const bearingEvent = result.current.events.find((event) => event.ownership === 'bearing');
    const deviceEvent = result.current.events.find(
      (event): event is DeviceCalendarEvent => event.ownership === 'device',
    );
    expect(bearingEvent).toBeDefined();
    expect(deviceEvent).toBeDefined();

    await act(async () => {
      await result.current.updateEvent(bearingEvent!, { title: 'Bearing updated' });
      await result.current.updateEvent(deviceEvent!, { title: 'Device updated' });
      await result.current.deleteEvent(bearingEvent!);
      await result.current.deleteEvent(deviceEvent!);
    });

    expect(updateFirebaseEvent).toHaveBeenCalledWith('user-1', 'bearing-1', {
      title: 'Bearing updated',
    });
    expect(deleteFirebaseEvent).toHaveBeenCalledWith('user-1', 'bearing-1');
    expect(adapter.updateEvent).toHaveBeenCalledWith('device-planning', {
      title: 'Device updated',
    });
    expect(adapter.deleteEvent).toHaveBeenCalledWith('device-planning');
    expect(adapter.updateEvent).not.toHaveBeenCalledWith(deviceEvent!.id, expect.anything());
  });

  it('rejects read-only device mutations before calling the adapter', async () => {
    const adapter = makeAdapter(jest.fn(async () => [nativeRecord('Read only')]));
    const { result } = renderHook(() => useCalendarEvents(new Date(2026, 6, 31), adapter));

    await waitFor(() => expect(result.current.events).toHaveLength(2));
    const deviceEvent = result.current.events.find(
      (event): event is DeviceCalendarEvent => event.ownership === 'device',
    );
    const readOnlyEvent = { ...deviceEvent!, allowsModifications: false };

    await expect(result.current.updateEvent(readOnlyEvent, { title: 'Blocked' })).rejects.toThrow(
      'This device calendar event is read-only.',
    );
    await expect(result.current.deleteEvent(readOnlyEvent)).rejects.toThrow(
      'This device calendar event is read-only.',
    );
    expect(adapter.updateEvent).not.toHaveBeenCalled();
    expect(adapter.deleteEvent).not.toHaveBeenCalled();
  });
});
