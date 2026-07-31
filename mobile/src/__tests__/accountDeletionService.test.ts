import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  cleanupLinkedCalendarCopies,
  purgeLocalAccountData,
} from '../features/profile/accountDeletionService';
import { DeviceCalendarAdapter } from '../services/calendar/deviceCalendarAdapter';
import {
  loadDeviceCalendarSettings,
  saveDeviceCalendarSettings,
} from '../services/calendar/deviceCalendarSettings';
import { loadTelemetryConsent, saveTelemetryConsent } from '../services/telemetry/telemetry';

function makeAdapter(): jest.Mocked<DeviceCalendarAdapter> {
  return {
    capabilities: { recurringEventMutationScopes: [] },
    getPermissionState: jest.fn(),
    requestPermission: jest.fn(),
    getCalendars: jest.fn(),
    listEvents: jest.fn(),
    createEvent: jest.fn(),
    lookupEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    openSettings: jest.fn(),
  };
}

describe('cleanupLinkedCalendarCopies', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('deletes reachable copies and purges local settings', async () => {
    const adapter = makeAdapter();
    adapter.lookupEvent.mockResolvedValue({ status: 'found', event: {} as never });
    adapter.deleteEvent.mockResolvedValue();
    await saveDeviceCalendarSettings('user-1', {
      selectedCalendarIds: ['calendar-1'],
      defaultCalendarId: 'calendar-1',
      linkCache: {
        'event-1': { calendarId: 'calendar-1', eventId: 'native-1', updatedAt: '2026-07-31' },
      },
    });

    await expect(cleanupLinkedCalendarCopies('user-1', adapter)).resolves.toEqual({
      removedCount: 1,
      failedCount: 0,
    });
    expect(adapter.deleteEvent).toHaveBeenCalledWith('native-1');
    await expect(loadDeviceCalendarSettings('user-1')).resolves.toBeNull();
  });

  it('retains unavailable links for retry', async () => {
    const adapter = makeAdapter();
    adapter.lookupEvent.mockResolvedValue({
      status: 'unavailable',
      error: new Error('permission denied'),
    });
    await saveDeviceCalendarSettings('user-1', {
      selectedCalendarIds: [],
      defaultCalendarId: null,
      linkCache: {
        'event-1': { calendarId: 'calendar-1', eventId: 'native-1', updatedAt: '2026-07-31' },
      },
    });

    await expect(cleanupLinkedCalendarCopies('user-1', adapter)).resolves.toEqual({
      removedCount: 0,
      failedCount: 1,
    });
    expect((await loadDeviceCalendarSettings('user-1'))?.linkCache['event-1']).toBeTruthy();
  });

  it('purges all account-scoped local data after account deletion', async () => {
    await saveDeviceCalendarSettings('user-1', {
      selectedCalendarIds: ['calendar-1'],
      defaultCalendarId: 'calendar-1',
      linkCache: {},
    });
    await saveTelemetryConsent('user-1', true);

    await expect(purgeLocalAccountData('user-1')).resolves.toEqual({ failedCount: 0 });
    await expect(loadDeviceCalendarSettings('user-1')).resolves.toBeNull();
    await expect(loadTelemetryConsent('user-1')).resolves.toBe(false);
  });

  it('reports local stores that could not be purged', async () => {
    const removeItem = jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('disk'));

    await expect(purgeLocalAccountData('user-1')).resolves.toEqual({ failedCount: 1 });

    removeItem.mockRestore();
  });
});
