import { describe, expect, it, jest } from '@jest/globals';

import {
  CalendarSettingsStorage,
  loadDeviceCalendarSettings,
  purgeDeviceCalendarSettings,
  saveDeviceCalendarSettings,
  subscribeDeviceCalendarSettings,
  validateDeviceCalendarSettings,
} from '../services/calendar/deviceCalendarSettings';

function makeStorage(): CalendarSettingsStorage {
  const values = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

const settings = {
  selectedCalendarIds: ['visible', 'missing'],
  defaultCalendarId: 'readonly',
  linkCache: {
    'bearing-1': {
      calendarId: 'visible',
      eventId: 'native-1',
      updatedAt: '2026-07-31T00:00:00.000Z',
    },
  },
};

describe('deviceCalendarSettings', () => {
  it('isolates settings and link caches by Firebase UID', async () => {
    const storage = makeStorage();
    await saveDeviceCalendarSettings('user/one', settings, storage);

    await expect(loadDeviceCalendarSettings('user/one', storage)).resolves.toEqual(settings);
    await expect(loadDeviceCalendarSettings('user/two', storage)).resolves.toBeNull();

    await purgeDeviceCalendarSettings('user/one', storage);
    await expect(loadDeviceCalendarSettings('user/one', storage)).resolves.toBeNull();
  });

  it('notifies only listeners for the changed Firebase UID', async () => {
    const storage = makeStorage();
    const userOneListener = jest.fn();
    const userTwoListener = jest.fn();
    const unsubscribe = subscribeDeviceCalendarSettings('user/one', userOneListener);
    subscribeDeviceCalendarSettings('user/two', userTwoListener);

    await saveDeviceCalendarSettings('user/one', settings, storage);
    expect(userOneListener).toHaveBeenCalledTimes(1);
    expect(userTwoListener).not.toHaveBeenCalled();

    unsubscribe();
    await purgeDeviceCalendarSettings('user/one', storage);
    expect(userOneListener).toHaveBeenCalledTimes(1);
  });

  it('removes stale selections and a read-only default while preserving link cache', () => {
    const validated = validateDeviceCalendarSettings(settings, [
      {
        id: 'visible',
        title: 'Visible',
        color: null,
        sourceLabel: 'Device',
        isVisible: true,
        isPrimary: false,
        isSynced: true,
        accessLevel: null,
        allowsModifications: true,
      },
      {
        id: 'readonly',
        title: 'Read only',
        color: null,
        sourceLabel: 'Device',
        isVisible: true,
        isPrimary: false,
        isSynced: true,
        accessLevel: 'read',
        allowsModifications: false,
      },
    ]);

    expect(validated.selectedCalendarIds).toEqual(['visible']);
    expect(validated.defaultCalendarId).toBeNull();
    expect(validated.removedCalendarIds).toEqual(['missing']);
    expect(validated.defaultCalendarWasRemoved).toBe(true);
    expect(validated.linkCache).toEqual(settings.linkCache);
  });
});
