import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { useDeviceCalendars } from '../features/calendar/useDeviceCalendars';
import { DeviceCalendarAdapter } from '../services/calendar/deviceCalendarAdapter';
import {
  loadDeviceCalendarSettings,
  saveDeviceCalendarSettings,
} from '../services/calendar/deviceCalendarSettings';

jest.mock('../services/calendar/deviceCalendarSettings', () => ({
  loadDeviceCalendarSettings: jest.fn(),
  saveDeviceCalendarSettings: jest.fn(async () => undefined),
  validateDeviceCalendarSettings: (
    jest.requireActual(
      '../services/calendar/deviceCalendarSettings',
    ) as typeof import('../services/calendar/deviceCalendarSettings')
  ).validateDeviceCalendarSettings,
}));

const calendars = [
  {
    id: 'work',
    title: 'Work',
    color: null,
    sourceLabel: 'Device',
    isVisible: true,
    isPrimary: true,
    isSynced: true,
    accessLevel: 'owner',
    allowsModifications: true,
  },
];

function makeAdapter(): DeviceCalendarAdapter {
  return {
    getPermissionState: jest.fn(async (): Promise<'granted'> => 'granted'),
    requestPermission: jest.fn(async (): Promise<'granted'> => 'granted'),
    getCalendars: jest.fn(async () => calendars),
    listEvents: jest.fn(async () => []),
    createEvent: jest.fn(async () => ({
      id: 'event-1',
      calendarId: 'work',
      title: 'Event',
      notes: '',
      startDate: new Date(2026, 6, 31, 9),
      endDate: new Date(2026, 6, 31, 10),
      allDay: false,
    })),
    updateEvent: jest.fn(async () => undefined),
    deleteEvent: jest.fn(async () => undefined),
    openSettings: jest.fn(async () => undefined),
  };
}

describe('useDeviceCalendars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads visible defaults and persists account-scoped selections', async () => {
    (
      loadDeviceCalendarSettings as jest.MockedFunction<typeof loadDeviceCalendarSettings>
    ).mockResolvedValue(null);
    const adapter = makeAdapter();
    const { result } = renderHook(() => useDeviceCalendars('user-1', adapter));

    await waitFor(() => expect(result.current.uiState).toBe('ready'));
    expect(result.current.selectedCalendarIds).toEqual(['work']);
    expect(saveDeviceCalendarSettings).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ selectedCalendarIds: ['work'] }),
    );

    await act(async () => {
      await result.current.setDefaultCalendar('work');
    });
    expect(result.current.defaultCalendarId).toBe('work');
  });

  it('does not expose the prior account state after the UID changes', async () => {
    (loadDeviceCalendarSettings as jest.MockedFunction<typeof loadDeviceCalendarSettings>)
      .mockResolvedValueOnce({
        selectedCalendarIds: ['work'],
        defaultCalendarId: 'work',
        linkCache: {},
      })
      .mockResolvedValueOnce({ selectedCalendarIds: [], defaultCalendarId: null, linkCache: {} });
    const adapter = makeAdapter();
    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useDeviceCalendars(userId, adapter),
      { initialProps: { userId: 'user-1' } },
    );

    await waitFor(() => expect(result.current.defaultCalendarId).toBe('work'));
    rerender({ userId: 'user-2' });
    await waitFor(() => expect(loadDeviceCalendarSettings).toHaveBeenCalledWith('user-2'));
    await waitFor(() => expect(result.current.defaultCalendarId).toBeNull());
  });
});
