import { BearingEvent, CalendarDisplayEvent, DeviceCalendarEvent } from './calendarTypes';
import {
  DeviceCalendar,
  DeviceCalendarEventRecord,
  DeviceCalendarLink,
} from './deviceCalendarTypes';

export function normalizeDeviceCalendarEvents(
  records: DeviceCalendarEventRecord[],
  calendars: DeviceCalendar[],
): DeviceCalendarEvent[] {
  const calendarsById = new Map(calendars.map((calendar) => [calendar.id, calendar]));

  return records.flatMap((record) => {
    const calendar = calendarsById.get(record.calendarId);
    if (!calendar) return [];

    return [
      {
        ownership: 'device' as const,
        id: `device:${encodeURIComponent(record.calendarId)}:${encodeURIComponent(record.id)}`,
        nativeEventId: record.id,
        calendarId: record.calendarId,
        calendarTitle: calendar.title,
        calendarColor: calendar.color,
        sourceLabel: calendar.sourceLabel,
        allowsModifications: calendar.allowsModifications,
        title: record.title || 'Untitled event',
        description: record.notes,
        startAt: record.startDate,
        endAt: record.endDate,
        timezone: record.timeZone,
        allDay: record.allDay,
        location: record.location,
        recurrenceRule: record.recurrenceRule,
        alarms: record.alarms,
        availability: record.availability,
        url: record.url,
        status: record.status,
      },
    ];
  });
}

function compareEvents(left: CalendarDisplayEvent, right: CalendarDisplayEvent): number {
  const startDifference = left.startAt.getTime() - right.startAt.getTime();
  if (startDifference !== 0) return startDifference;

  const endDifference = left.endAt.getTime() - right.endAt.getTime();
  if (endDifference !== 0) return endDifference;

  return left.id.localeCompare(right.id);
}

export function mergeCalendarEvents(
  bearingEvents: BearingEvent[],
  deviceEvents: DeviceCalendarEvent[],
  linkCache: Record<string, DeviceCalendarLink>,
): CalendarDisplayEvent[] {
  const linkedDeviceKeys = new Set(
    Object.values(linkCache).map((link) => `${link.calendarId}\u0000${link.eventId}`),
  );

  return [
    ...bearingEvents,
    ...deviceEvents.filter(
      (event) => !linkedDeviceKeys.has(`${event.calendarId}\u0000${event.nativeEventId}`),
    ),
  ].sort(compareEvents);
}
