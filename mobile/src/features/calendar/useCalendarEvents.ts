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
import { subscribeToEventsByDateRange } from '../../services/firebase/firebaseEvents';
import { recordTelemetryEvent } from '../../services/telemetry/telemetry';
import {
  BearingEvent,
  CalendarDisplayEvent,
  DeviceCalendarEvent,
  CalendarUiState,
  CreateEventInput,
  CreateEventOptions,
  UpdateEventInput,
} from './calendarTypes';
import { mergeCalendarEvents, normalizeDeviceCalendarEvents } from './calendarEventAggregation';
import { DeviceCalendarLink } from './deviceCalendarTypes';
import { useDeviceCalendars } from './useDeviceCalendars';
import { createCalendarPublicationService } from './calendarPublicationService';

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
  publicationCalendarTitle: string | null;
  refresh: () => Promise<void>;
  createEvent: (input: CreateEventInput, options?: CreateEventOptions) => Promise<string>;
  updateEvent: (event: CalendarDisplayEvent, fields: UpdateEventInput) => Promise<void>;
  deleteEvent: (event: CalendarDisplayEvent) => Promise<void>;
  retryPublication: (event: BearingEvent) => Promise<void>;
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
  const publicationService = useMemo(
    () => createCalendarPublicationService({ adapter }),
    [adapter],
  );
  const [bearingEvents, setBearingEvents] = useState<BearingEvent[]>([]);
  const [deviceEvents, setDeviceEvents] = useState<DeviceCalendarEvent[]>([]);
  const [linkCache, setLinkCache] = useState<Record<string, DeviceCalendarLink>>({});
  const [firestoreState, setFirestoreState] = useState<CalendarUiState>('loading');
  const [firestoreRevision, setFirestoreRevision] = useState(0);
  const [deviceError, setDeviceError] = useState<Error | null>(null);
  const nativeRequestIdRef = useRef(0);
  const bearingEventsRef = useRef<BearingEvent[]>([]);
  const deviceRecordsRef = useRef<Awaited<ReturnType<DeviceCalendarAdapter['listEvents']>>>([]);
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
        bearingEventsRef.current = fetched;
        setBearingEvents(fetched);
        setFirestoreState(fetched.length === 0 ? 'empty' : 'ready');
      },
      () => {
        setFirestoreState('error');
      },
    );

    return unsubscribe;
  }, [firestoreRevision, monthEnd, monthStart, userId]);

  const refreshDeviceEvents = useCallback(async (): Promise<void> => {
    const requestId = ++nativeRequestIdRef.current;

    if (!userId || deviceCalendars.permission !== 'granted' || selectedCalendarIds.length === 0) {
      setDeviceEvents([]);
      deviceRecordsRef.current = [];
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

      deviceRecordsRef.current = records;
      setDeviceEvents(normalizeDeviceCalendarEvents(records, calendars));
      const synchronizedLinks = await publicationService.synchronizeVisibleEvents(
        userId,
        bearingEventsRef.current,
        records,
      );
      if (requestId !== nativeRequestIdRef.current) return;
      setLinkCache(synchronizedLinks ?? settings?.linkCache ?? {});
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
    publicationService,
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
    if (!userId || firestoreState === 'loading' || deviceCalendars.permission !== 'granted') {
      return;
    }

    let canceled = false;
    void publicationService
      .synchronizeVisibleEvents(userId, bearingEvents, deviceRecordsRef.current)
      .then((synchronizedLinks) => {
        if (!canceled) setLinkCache(synchronizedLinks);
      });
    return () => {
      canceled = true;
    };
  }, [bearingEvents, deviceCalendars.permission, firestoreState, publicationService, userId]);

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
  const publicationCalendarTitle = deviceCalendars.defaultCalendarId
    ? (calendars.find((calendar) => calendar.id === deviceCalendars.defaultCalendarId)?.title ??
      null)
    : null;

  const eventsForDate = useCallback(
    (date: Date): CalendarDisplayEvent[] =>
      events.filter((event) => isSameCalendarDay(event.startAt, date)),
    [events],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setFirestoreState('loading');
    setFirestoreRevision((current) => current + 1);
    await refreshDeviceEvents();
  }, [refreshDeviceEvents]);

  const createEvent = useCallback(
    async (
      input: CreateEventInput,
      options: CreateEventOptions = { publishToDevice: false },
    ): Promise<string> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');
      try {
        const result = await publicationService.createEvent(userId, input, options);
        await refreshDeviceEvents();
        if (options.publishToDevice) {
          void recordTelemetryEvent('calendar_publication_result', {
            operation: 'create',
            outcome: result.status === 'published' ? 'success' : 'failure',
          });
        }
        return result.eventId;
      } catch (createError) {
        if (options.publishToDevice) {
          void recordTelemetryEvent('calendar_publication_result', {
            operation: 'create',
            outcome: 'failure',
          });
        }
        throw createError;
      }
    },
    [publicationService, refreshDeviceEvents],
  );

  const updateEvent = useCallback(
    async (event: CalendarDisplayEvent, fields: UpdateEventInput): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');

      const tracksPublication =
        event.ownership === 'bearing' && event.publication.status === 'published';
      try {
        let publicationOutcome: 'published' | 'failed' | 'not-applicable' = 'not-applicable';
        if (event.ownership === 'bearing') {
          publicationOutcome = await publicationService.updateEvent(userId, event, fields);
        } else {
          if (!event.allowsModifications) {
            throw new Error('This device calendar event is read-only.');
          }
          await adapter.updateEvent(event.nativeEventId, fields);
        }
        await refreshDeviceEvents();
        if (tracksPublication) {
          void recordTelemetryEvent('calendar_publication_result', {
            operation: 'update',
            outcome: publicationOutcome === 'published' ? 'success' : 'failure',
          });
        }
      } catch (updateError) {
        if (tracksPublication) {
          void recordTelemetryEvent('calendar_publication_result', {
            operation: 'update',
            outcome: 'failure',
          });
        }
        throw updateError;
      }
    },
    [adapter, publicationService, refreshDeviceEvents],
  );

  const deleteEvent = useCallback(
    async (event: CalendarDisplayEvent): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');

      const tracksPublication =
        event.ownership === 'bearing' && event.publication.status !== 'unpublished';
      try {
        if (event.ownership === 'bearing') {
          await publicationService.deleteEvent(userId, event);
        } else {
          if (!event.allowsModifications) {
            throw new Error('This device calendar event is read-only.');
          }
          await adapter.deleteEvent(event.nativeEventId);
        }
        await refreshDeviceEvents();
        if (tracksPublication) {
          void recordTelemetryEvent('calendar_publication_result', {
            operation: 'delete',
            outcome: 'success',
          });
        }
      } catch (deleteError) {
        if (tracksPublication) {
          void recordTelemetryEvent('calendar_publication_result', {
            operation: 'delete',
            outcome: 'failure',
          });
        }
        throw deleteError;
      }
    },
    [adapter, publicationService, refreshDeviceEvents],
  );

  const retryPublication = useCallback(
    async (event: BearingEvent): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) throw new Error('User is not authenticated.');
      const result = await publicationService.retryPublication(userId, event);
      await refreshDeviceEvents();
      void recordTelemetryEvent('calendar_publication_result', {
        operation: 'retry',
        outcome: result.status === 'published' ? 'success' : 'failure',
      });
    },
    [publicationService, refreshDeviceEvents],
  );

  return {
    events,
    eventsForDate,
    uiState,
    deviceError,
    publicationCalendarTitle,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    retryPublication,
  };
}
