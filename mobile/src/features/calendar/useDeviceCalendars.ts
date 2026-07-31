import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DeviceCalendar,
  DeviceCalendarPermissionState,
  DeviceCalendarSettings,
} from './deviceCalendarTypes';
import {
  DeviceCalendarAdapter,
  deviceCalendarAdapter,
} from '../../services/calendar/deviceCalendarAdapter';
import {
  loadDeviceCalendarSettings,
  saveDeviceCalendarSettings,
  validateDeviceCalendarSettings,
} from '../../services/calendar/deviceCalendarSettings';

export type DeviceCalendarsUiState =
  'loading' | 'permission-required' | 'ready' | 'unavailable' | 'error';

export type UseDeviceCalendarsReturn = {
  calendars: DeviceCalendar[];
  permission: DeviceCalendarPermissionState;
  selectedCalendarIds: string[];
  defaultCalendarId: string | null;
  uiState: DeviceCalendarsUiState;
  error: Error | null;
  staleSelectionRecovered: boolean;
  requestPermission: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleCalendar: (calendarId: string) => Promise<void>;
  setDefaultCalendar: (calendarId: string | null) => Promise<void>;
  openSettings: () => Promise<void>;
};

const EMPTY_SETTINGS: DeviceCalendarSettings = {
  selectedCalendarIds: [],
  defaultCalendarId: null,
  linkCache: {},
};

export function useDeviceCalendars(
  userId: string | null,
  adapter: DeviceCalendarAdapter = deviceCalendarAdapter,
): UseDeviceCalendarsReturn {
  const requestIdRef = useRef(0);
  const settingsRef = useRef<DeviceCalendarSettings>(EMPTY_SETTINGS);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [permission, setPermission] = useState<DeviceCalendarPermissionState>('undetermined');
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [defaultCalendarId, setDefaultCalendarIdState] = useState<string | null>(null);
  const [uiState, setUiState] = useState<DeviceCalendarsUiState>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [staleSelectionRecovered, setStaleSelectionRecovered] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    setUiState('loading');
    setError(null);

    if (!userId) {
      settingsRef.current = EMPTY_SETTINGS;
      setCalendars([]);
      setSelectedCalendarIds([]);
      setDefaultCalendarIdState(null);
      setUiState('unavailable');
      return;
    }

    try {
      const nextPermission = await adapter.getPermissionState();
      if (requestId !== requestIdRef.current) return;

      setPermission(nextPermission);
      if (nextPermission === 'unavailable') {
        setUiState('unavailable');
        return;
      }
      if (nextPermission !== 'granted') {
        setUiState('permission-required');
        return;
      }

      const [discoveredCalendars, storedSettings] = await Promise.all([
        adapter.getCalendars(),
        loadDeviceCalendarSettings(userId),
      ]);
      if (requestId !== requestIdRef.current) return;

      const initialSettings = storedSettings ?? {
        ...EMPTY_SETTINGS,
        selectedCalendarIds: discoveredCalendars
          .filter((calendar) => calendar.isVisible)
          .map((calendar) => calendar.id),
      };
      const validated = validateDeviceCalendarSettings(initialSettings, discoveredCalendars);
      const nextSettings: DeviceCalendarSettings = {
        selectedCalendarIds: validated.selectedCalendarIds,
        defaultCalendarId: validated.defaultCalendarId,
        linkCache: validated.linkCache,
      };

      settingsRef.current = nextSettings;
      setCalendars(discoveredCalendars);
      setSelectedCalendarIds(nextSettings.selectedCalendarIds);
      setDefaultCalendarIdState(nextSettings.defaultCalendarId);
      setStaleSelectionRecovered(
        validated.removedCalendarIds.length > 0 || validated.defaultCalendarWasRemoved,
      );
      setUiState('ready');

      if (
        !storedSettings ||
        validated.removedCalendarIds.length > 0 ||
        validated.defaultCalendarWasRemoved
      ) {
        await saveDeviceCalendarSettings(userId, nextSettings);
      }
    } catch (refreshError) {
      if (requestId !== requestIdRef.current) return;
      setUiState('error');
      setError(
        refreshError instanceof Error
          ? refreshError
          : new Error('Failed to load device calendars.'),
      );
    }
  }, [adapter, userId]);

  useEffect(() => {
    void refresh();
    return () => {
      requestIdRef.current += 1;
    };
  }, [refresh]);

  const requestPermission = useCallback(async (): Promise<void> => {
    const nextPermission = await adapter.requestPermission();
    setPermission(nextPermission);
    await refresh();
  }, [adapter, refresh]);

  const persistSettings = useCallback(
    async (nextSettings: DeviceCalendarSettings): Promise<void> => {
      if (!userId) {
        throw new Error('User is not authenticated.');
      }
      await saveDeviceCalendarSettings(userId, nextSettings);
      settingsRef.current = nextSettings;
      setSelectedCalendarIds(nextSettings.selectedCalendarIds);
      setDefaultCalendarIdState(nextSettings.defaultCalendarId);
    },
    [userId],
  );

  const toggleCalendar = useCallback(
    async (calendarId: string): Promise<void> => {
      if (!calendars.some((calendar) => calendar.id === calendarId)) {
        throw new Error('That device calendar is no longer available.');
      }

      const selected = settingsRef.current.selectedCalendarIds;
      await persistSettings({
        ...settingsRef.current,
        selectedCalendarIds: selected.includes(calendarId)
          ? selected.filter((id) => id !== calendarId)
          : [...selected, calendarId],
      });
    },
    [calendars, persistSettings],
  );

  const setDefaultCalendar = useCallback(
    async (calendarId: string | null): Promise<void> => {
      const calendar = calendarId
        ? calendars.find((candidate) => candidate.id === calendarId)
        : null;
      if (calendarId && (!calendar || !calendar.allowsModifications)) {
        throw new Error('Choose a writable device calendar.');
      }

      await persistSettings({ ...settingsRef.current, defaultCalendarId: calendarId });
    },
    [calendars, persistSettings],
  );

  return {
    calendars,
    permission,
    selectedCalendarIds,
    defaultCalendarId,
    uiState,
    error,
    staleSelectionRecovered,
    requestPermission,
    refresh,
    toggleCalendar,
    setDefaultCalendar,
    openSettings: adapter.openSettings,
  };
}
