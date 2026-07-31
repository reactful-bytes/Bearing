import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  DeviceCalendarAdapter,
  deviceCalendarAdapter,
} from '../../services/calendar/deviceCalendarAdapter';
import {
  loadDeviceCalendarSettings,
  subscribeDeviceCalendarSettings,
} from '../../services/calendar/deviceCalendarSettings';
import {
  createEvent as createFirebaseEvent,
  deleteEvent as deleteFirebaseEvent,
  subscribeToEventsByDateRange,
  updateEvent as updateFirebaseEvent,
} from '../../services/firebase/firebaseEvents';
import {
  BearingEvent,
  CalendarDisplayEvent,
  DeviceCalendarEvent,
  CalendarUiState,
  CreateEventInput,
  UpdateEventInput,
} from './calendarTypes';
import { mergeCalendarEvents, normalizeDeviceCalendarEvents } from './calendarEventAggregation';
import { DeviceCalendarLink } from './deviceCalendarTypes';
import { useDeviceCalendars } from './useDeviceCalendars';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseCalendarEventsReturn = {
  /** All events loaded for the visible month. */
  events: CalendarDisplayEvent[];
  /** Events filtered to the given date. */
  eventsForDate: (date: Date) => CalendarDisplayEvent[];
  uiState: CalendarUiState;
  deviceError: Error | null;
  refresh: () => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<void>;
  updateEvent: (eventId: string, fields: UpdateEventInput) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
};

/**
 * Loads and subscribes to events for the month containing `selectedDate`.
 * Re-subscribes automatically when the month changes.
 */
export function useCalendarEvents(
  selectedDate: Date,
  adapter: DeviceCalendarAdapter = deviceCalendarAdapter,
): UseCalendarEventsReturn {
  const userId = getFirebaseAuth().currentUser?.uid ?? null;
  const deviceCalendars = useDeviceCalendars(userId, adapter);
  const [bearingEvents, setBearingEvents] = useState<BearingEvent[]>([]);
  const [deviceEvents, setDeviceEvents] = useState<DeviceCalendarEvent[]>([]);
  const [linkCache, setLinkCache] = useState<Record<string, DeviceCalendarLink>>({});
  const [firestoreState, setFirestoreState] = useState<CalendarUiState>('loading');
  const [deviceError, setDeviceError] = useState<Error | null>(null);
  const nativeRequestIdRef = useRef(0);
  const calendars = deviceCalendars.calendars;
  const selectedCalendarIds = deviceCalendars.selectedCalendarIds;
  const refreshDeviceCalendars = deviceCalendars.refresh;

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const monthStart = useMemo(() => getMonthStart(new Date(year, month, 1)), [month, year]);
  const monthEnd = useMemo(() => getMonthEnd(new Date(year, month, 1)), [month, year]);

  useEffect(() => {
    if (!userId) {
      setFirestoreState('error');
      return;
    }

    setFirestoreState('loading');

    const unsubscribe = subscribeToEventsByDateRange(
      userId,
      monthStart,
      monthEnd,
      (fetched) => {
        setBearingEvents(fetched);
        setFirestoreState(fetched.length === 0 ? 'empty' : 'ready');
      },
      () => {
        setFirestoreState('error');
      },
    );

    return unsubscribe;
  }, [monthEnd, monthStart, userId]);

  const refreshDeviceEvents = useCallback(async (): Promise<void> => {
    const requestId = ++nativeRequestIdRef.current;

    if (!userId || deviceCalendars.permission !== 'granted' || selectedCalendarIds.length === 0) {
      setDeviceEvents([]);
      setLinkCache({});
      setDeviceError(null);
      return;
    }

    try {
      const [records, settings] = await Promise.all([
        adapter.listEvents(selectedCalendarIds, monthStart, monthEnd),
        loadDeviceCalendarSettings(userId),
      ]);
      if (requestId !== nativeRequestIdRef.current) return;

      setDeviceEvents(normalizeDeviceCalendarEvents(records, calendars));
      setLinkCache(settings?.linkCache ?? {});
      setDeviceError(null);
    } catch (nativeError) {
      if (requestId !== nativeRequestIdRef.current) return;
      setDeviceEvents([]);
      setDeviceError(
        nativeError instanceof Error
          ? nativeError
          : new Error('Failed to load device calendar events.'),
      );
    }
  }, [
    adapter,
    calendars,
    deviceCalendars.permission,
    monthEnd,
    monthStart,
    selectedCalendarIds,
    userId,
  ]);

  useEffect(() => {
    void refreshDeviceEvents();
    return () => {
      nativeRequestIdRef.current += 1;
    };
  }, [refreshDeviceEvents]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshDeviceEvents();
    });
    return () => subscription.remove();
  }, [refreshDeviceEvents]);

  useEffect(() => {
    if (!userId) return;
    return subscribeDeviceCalendarSettings(userId, () => {
      void refreshDeviceCalendars();
    });
  }, [refreshDeviceCalendars, userId]);

  const events = useMemo(
    () => mergeCalendarEvents(bearingEvents, deviceEvents, linkCache),
    [bearingEvents, deviceEvents, linkCache],
  );
  const uiState: CalendarUiState =
    firestoreState === 'loading' || firestoreState === 'error'
      ? firestoreState
      : events.length === 0
        ? 'empty'
        : 'ready';

  const eventsForDate = useCallback(
    (date: Date): CalendarDisplayEvent[] =>
      events.filter((event) => isSameCalendarDay(event.startAt, date)),
    [events],
  );

  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');
      await createFirebaseEvent(userId, input);
      await refreshDeviceEvents();
    },
    [refreshDeviceEvents],
  );

  const updateEvent = useCallback(
    async (eventId: string, fields: UpdateEventInput): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');
      await updateFirebaseEvent(userId, eventId, fields);
      await refreshDeviceEvents();
    },
    [refreshDeviceEvents],
  );

  const deleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');
      await deleteFirebaseEvent(userId, eventId);
      await refreshDeviceEvents();
    },
    [refreshDeviceEvents],
  );

  return {
    events,
    eventsForDate,
    uiState,
    deviceError,
    refresh: refreshDeviceEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
