import { useCallback, useEffect, useMemo } from 'react';

import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import { CreateEventInput, CreateEventOptions } from './calendarTypes';
import { calendarPublicationService } from './calendarPublicationService';
import { useDeviceCalendars } from './useDeviceCalendars';
import { subscribeDeviceCalendarSettings } from '../../services/calendar/deviceCalendarSettings';

export type UseCalendarPublicationReturn = {
  publicationCalendarTitle: string | null;
  createEvent: (input: CreateEventInput, options?: CreateEventOptions) => Promise<string>;
  publishEvent: (eventId: string, input: CreateEventInput) => Promise<void>;
};

export function useCalendarPublication(): UseCalendarPublicationReturn {
  const userId = getFirebaseAuth().currentUser?.uid ?? null;
  const deviceCalendars = useDeviceCalendars(userId);
  const refreshDeviceCalendars = deviceCalendars.refresh;
  useEffect(() => {
    if (!userId) return;
    return subscribeDeviceCalendarSettings(userId, () => {
      void refreshDeviceCalendars();
    });
  }, [refreshDeviceCalendars, userId]);

  const publicationCalendarTitle = useMemo(() => {
    if (!deviceCalendars.defaultCalendarId) return null;
    return (
      deviceCalendars.calendars.find(
        (calendar) => calendar.id === deviceCalendars.defaultCalendarId,
      )?.title ?? null
    );
  }, [deviceCalendars.calendars, deviceCalendars.defaultCalendarId]);

  const createEvent = useCallback(
    async (
      input: CreateEventInput,
      options: CreateEventOptions = { publishToDevice: false },
    ): Promise<string> => {
      if (!userId) throw new Error('User is not authenticated.');
      const result = await calendarPublicationService.createEvent(userId, input, options);
      return result.eventId;
    },
    [userId],
  );

  const publishEvent = useCallback(
    async (eventId: string, input: CreateEventInput): Promise<void> => {
      if (!userId) throw new Error('User is not authenticated.');
      await calendarPublicationService.publishEvent(userId, eventId, input);
    },
    [userId],
  );

  return { publicationCalendarTitle, createEvent, publishEvent };
}
