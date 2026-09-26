import { eventFormValueToDate, toEventDateString, toEventTimeString } from './eventEditor';
import {
  BearingEvent,
  CalendarDisplayEvent,
  EVENT_WEEKDAYS,
  EventRecurrenceRule,
} from './calendarTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function dateIndex(value: string): number | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
}

function dateStringFromIndex(index: number): string {
  return new Date(index * DAY_MS).toISOString().slice(0, 10);
}

export function recurrenceOccurrenceNumber(
  rule: EventRecurrenceRule,
  startDate: string,
  occurrenceDate: string,
): number | null {
  const start = parseDateParts(startDate);
  const occurrence = parseDateParts(occurrenceDate);
  const startIndex = dateIndex(startDate);
  const occurrenceIndex = dateIndex(occurrenceDate);
  if (!start || !occurrence || startIndex === null || occurrenceIndex === null) return null;

  const dayDifference = occurrenceIndex - startIndex;
  if (dayDifference < 0) return null;
  const interval = Number.isSafeInteger(rule.interval) && rule.interval > 0 ? rule.interval : 1;

  if (rule.frequency === 'daily') {
    return dayDifference % interval === 0 ? dayDifference / interval + 1 : null;
  }

  if (rule.frequency === 'weekly' && rule.weekdays.length === 0) {
    const period = interval * 7;
    return dayDifference % period === 0 ? dayDifference / period + 1 : null;
  }

  if (rule.frequency === 'weekly') {
    if (occurrenceIndex === startIndex) return 1;
    const startWeek = startIndex - new Date(startIndex * DAY_MS).getUTCDay();
    const occurrenceWeek = occurrenceIndex - new Date(occurrenceIndex * DAY_MS).getUTCDay();
    const weekDifference = Math.floor((occurrenceWeek - startWeek) / 7);
    const weekday = new Date(occurrenceIndex * DAY_MS).getUTCDay();
    if (weekDifference < 0 || weekDifference % interval !== 0) return null;
    if (!rule.weekdays.includes(EVENT_WEEKDAYS[weekday])) return null;

    // DTSTART is the first occurrence even if a user later removes its weekday.
    let count = 1;
    for (const selectedWeekday of rule.weekdays) {
      const weekdayIndex = EVENT_WEEKDAYS.indexOf(selectedWeekday);
      let firstMatch = startWeek + weekdayIndex;
      if (firstMatch < startIndex) firstMatch += interval * 7;
      if (firstMatch > occurrenceIndex) continue;
      const weekCount = Math.floor(weekDifference / interval) + 1;
      const matchesForWeekday = Math.min(
        weekCount,
        Math.floor((occurrenceIndex - firstMatch) / (interval * 7)) + 1,
      );
      count += matchesForWeekday;
    }

    // Do not count DTSTART twice when it is also one of the selected weekdays.
    const startsOnSelectedWeekday = rule.weekdays.includes(
      EVENT_WEEKDAYS[new Date(startIndex * DAY_MS).getUTCDay()],
    );
    return count - (startsOnSelectedWeekday ? 1 : 0);
  }

  if (rule.frequency === 'monthly') {
    const monthDifference = (occurrence.year - start.year) * 12 + (occurrence.month - start.month);
    return monthDifference >= 0 && monthDifference % interval === 0 && occurrence.day === start.day
      ? monthDifference / interval + 1
      : null;
  }

  const yearDifference = occurrence.year - start.year;
  return yearDifference >= 0 &&
    yearDifference % interval === 0 &&
    occurrence.month === start.month &&
    occurrence.day === start.day
    ? yearDifference / interval + 1
    : null;
}

export function getRecurrenceOccurrenceNumberForEvent(
  event: BearingEvent,
  occurrenceStartAt: Date,
): number | null {
  if (!event.recurrenceRule) return null;
  return recurrenceOccurrenceNumber(
    event.recurrenceRule,
    toEventDateString(event.recurrenceStartAt ?? event.startAt, event.timezone),
    event.recurrenceInstanceDate ?? toEventDateString(occurrenceStartAt, event.timezone),
  );
}

function occurrenceStartsOnDate(event: BearingEvent, date: string, number: number): Date | null {
  const rule = event.recurrenceRule;
  if (!rule || (rule.occurrenceCount !== null && number > rule.occurrenceCount)) return null;

  const dateAtEventTime = eventFormValueToDate(
    date,
    toEventTimeString(event.startAt, event.timezone),
    event.timezone,
  );
  if (!dateAtEventTime) return null;
  if (rule.endAt && dateAtEventTime > rule.endAt) return null;
  return dateAtEventTime;
}

function occurrenceEndAt(event: BearingEvent, occurrenceStartAt: Date): Date {
  if (!event.allDay) {
    return new Date(occurrenceStartAt.getTime() + event.endAt.getTime() - event.startAt.getTime());
  }

  const startDate = toEventDateString(event.startAt, event.timezone);
  const endDate = toEventDateString(event.endAt, event.timezone);
  const startIndex = dateIndex(startDate);
  const endIndex = dateIndex(endDate);
  if (startIndex === null || endIndex === null) return event.endAt;

  const occurrenceDate = toEventDateString(occurrenceStartAt, event.timezone);
  const occurrenceIndex = dateIndex(occurrenceDate);
  if (occurrenceIndex === null) return event.endAt;
  const shiftedEndDate = dateStringFromIndex(occurrenceIndex + endIndex - startIndex);
  return (
    eventFormValueToDate(shiftedEndDate, '00:00', event.timezone) ??
    new Date(occurrenceStartAt.getTime() + event.endAt.getTime() - event.startAt.getTime())
  );
}

function eventOverlapsRange(event: CalendarDisplayEvent, start: Date, end: Date): boolean {
  return event.startAt <= end && event.endAt > start;
}

/** Projects recurring Bearing events into concrete display occurrences for a visible range. */
export function expandCalendarEventsForRange(
  events: CalendarDisplayEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarDisplayEvent[] {
  const displayEvents: CalendarDisplayEvent[] = [];

  for (const event of events) {
    if (event.ownership !== 'bearing' || !event.recurrenceRule) {
      if (eventOverlapsRange(event, rangeStart, rangeEnd)) displayEvents.push(event);
      continue;
    }

    const startDate = toEventDateString(event.startAt, event.timezone);
    const endDate = toEventDateString(rangeEnd, event.timezone);
    const startIndex = dateIndex(startDate);
    const visibleEndIndex = dateIndex(endDate);
    const visibleStartIndex = dateIndex(toEventDateString(rangeStart, event.timezone));
    if (startIndex === null || visibleEndIndex === null || visibleStartIndex === null) continue;

    const eventDurationDays = Math.ceil((event.endAt.getTime() - event.startAt.getTime()) / DAY_MS);
    const scanStart = Math.max(startIndex, visibleStartIndex - eventDurationDays - 1);

    for (let dayIndex = scanStart; dayIndex <= visibleEndIndex; dayIndex += 1) {
      const date = dateStringFromIndex(dayIndex);
      if (event.excludedOccurrenceDates?.includes(date)) continue;
      const occurrenceNumber = recurrenceOccurrenceNumber(event.recurrenceRule, startDate, date);
      if (occurrenceNumber === null) continue;
      const startAt = occurrenceStartsOnDate(event, date, occurrenceNumber);
      if (!startAt) continue;

      const override = event.recurrenceOverrides?.[date];
      const occurrence = {
        ...event,
        ...override,
        recurrenceStartAt: event.recurrenceStartAt ?? event.startAt,
        recurrenceInstanceDate: date,
        startAt,
        endAt: occurrenceEndAt(event, startAt),
      };
      const adjustedOccurrence = {
        ...occurrence,
        startAt: override?.startAt ?? occurrence.startAt,
        endAt: override?.endAt ?? occurrence.endAt,
      };
      if (eventOverlapsRange(adjustedOccurrence, rangeStart, rangeEnd)) {
        displayEvents.push(adjustedOccurrence);
      }
    }

    for (const [instanceDate, override] of Object.entries(event.recurrenceOverrides ?? {})) {
      const instanceIndex = dateIndex(instanceDate);
      if (
        instanceIndex === null ||
        (instanceIndex >= scanStart && instanceIndex <= visibleEndIndex)
      ) {
        continue;
      }
      const occurrenceNumber = recurrenceOccurrenceNumber(
        event.recurrenceRule,
        startDate,
        instanceDate,
      );
      if (occurrenceNumber === null) continue;
      const baseStartAt = occurrenceStartsOnDate(event, instanceDate, occurrenceNumber);
      if (!baseStartAt) continue;
      const adjustedOccurrence = {
        ...event,
        ...override,
        recurrenceStartAt: event.recurrenceStartAt ?? event.startAt,
        recurrenceInstanceDate: instanceDate,
        startAt: override.startAt ?? baseStartAt,
        endAt: override.endAt ?? occurrenceEndAt(event, baseStartAt),
      };
      if (eventOverlapsRange(adjustedOccurrence, rangeStart, rangeEnd)) {
        displayEvents.push(adjustedOccurrence);
      }
    }
  }

  return displayEvents.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}
