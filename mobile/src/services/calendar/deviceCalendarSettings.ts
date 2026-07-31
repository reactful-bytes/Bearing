import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DeviceCalendar,
  DeviceCalendarLink,
  DeviceCalendarSettings,
  ValidatedDeviceCalendarSettings,
} from '../../features/calendar/deviceCalendarTypes';

export type CalendarSettingsStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem'
>;

const STORAGE_PREFIX = '@bearing/device-calendar/v1/';
const settingsListeners = new Map<string, Set<() => void>>();

const EMPTY_SETTINGS: DeviceCalendarSettings = {
  selectedCalendarIds: [],
  defaultCalendarId: null,
  linkCache: {},
};

function notifySettingsChanged(userId: string): void {
  settingsListeners.get(userId)?.forEach((listener) => listener());
}

export function subscribeDeviceCalendarSettings(userId: string, listener: () => void): () => void {
  const listeners = settingsListeners.get(userId) ?? new Set<() => void>();
  listeners.add(listener);
  settingsListeners.set(userId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) settingsListeners.delete(userId);
  };
}

function getStorageKey(userId: string): string {
  if (!userId.trim()) {
    throw new Error('A Firebase UID is required for device calendar settings.');
  }

  return `${STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function parseLinkCache(value: unknown): Record<string, DeviceCalendarLink> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, DeviceCalendarLink] => {
      const link = entry[1] as Partial<DeviceCalendarLink> | null;
      return Boolean(
        link &&
        typeof link.calendarId === 'string' &&
        typeof link.eventId === 'string' &&
        typeof link.updatedAt === 'string',
      );
    }),
  );
}

export async function loadDeviceCalendarSettings(
  userId: string,
  storage: CalendarSettingsStorage = AsyncStorage,
): Promise<DeviceCalendarSettings | null> {
  const serialized = await storage.getItem(getStorageKey(userId));
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<DeviceCalendarSettings>;
    return {
      selectedCalendarIds: Array.isArray(parsed.selectedCalendarIds)
        ? [
            ...new Set(
              parsed.selectedCalendarIds.filter((id): id is string => typeof id === 'string'),
            ),
          ]
        : [],
      defaultCalendarId:
        typeof parsed.defaultCalendarId === 'string' ? parsed.defaultCalendarId : null,
      linkCache: parseLinkCache(parsed.linkCache),
    };
  } catch (error) {
    throw new Error('Failed to decode device calendar settings.', { cause: error });
  }
}

export async function saveDeviceCalendarSettings(
  userId: string,
  settings: DeviceCalendarSettings,
  storage: CalendarSettingsStorage = AsyncStorage,
): Promise<void> {
  await storage.setItem(getStorageKey(userId), JSON.stringify(settings));
  notifySettingsChanged(userId);
}

export async function purgeDeviceCalendarSettings(
  userId: string,
  storage: CalendarSettingsStorage = AsyncStorage,
): Promise<void> {
  await storage.removeItem(getStorageKey(userId));
  notifySettingsChanged(userId);
}

export async function saveDeviceCalendarLink(
  userId: string,
  bearingEventId: string,
  link: DeviceCalendarLink,
  storage: CalendarSettingsStorage = AsyncStorage,
): Promise<void> {
  const settings = (await loadDeviceCalendarSettings(userId, storage)) ?? EMPTY_SETTINGS;
  await saveDeviceCalendarSettings(
    userId,
    {
      ...settings,
      linkCache: { ...settings.linkCache, [bearingEventId]: link },
    },
    storage,
  );
}

export async function removeDeviceCalendarLink(
  userId: string,
  bearingEventId: string,
  storage: CalendarSettingsStorage = AsyncStorage,
): Promise<void> {
  const settings = await loadDeviceCalendarSettings(userId, storage);
  if (!settings?.linkCache[bearingEventId]) return;

  const linkCache = { ...settings.linkCache };
  delete linkCache[bearingEventId];
  await saveDeviceCalendarSettings(userId, { ...settings, linkCache }, storage);
}

export function validateDeviceCalendarSettings(
  settings: DeviceCalendarSettings,
  calendars: DeviceCalendar[],
): ValidatedDeviceCalendarSettings {
  const calendarsById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const selectedCalendarIds = settings.selectedCalendarIds.filter((id) => calendarsById.has(id));
  const removedCalendarIds = settings.selectedCalendarIds.filter((id) => !calendarsById.has(id));
  const defaultCalendar = settings.defaultCalendarId
    ? calendarsById.get(settings.defaultCalendarId)
    : null;
  const defaultCalendarWasRemoved = Boolean(
    settings.defaultCalendarId && (!defaultCalendar || !defaultCalendar.allowsModifications),
  );

  return {
    selectedCalendarIds,
    defaultCalendarId: defaultCalendarWasRemoved ? null : settings.defaultCalendarId,
    linkCache: settings.linkCache,
    removedCalendarIds,
    defaultCalendarWasRemoved,
  };
}
