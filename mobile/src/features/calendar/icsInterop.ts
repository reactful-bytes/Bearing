import { BearingEvent, CalendarDisplayEvent, EventAlarm } from './calendarTypes';

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtcDateTime(value: Date): string {
  const year = value.getUTCFullYear();
  const month = pad(value.getUTCMonth() + 1);
  const day = pad(value.getUTCDate());
  const hour = pad(value.getUTCHours());
  const minute = pad(value.getUTCMinutes());
  const second = pad(value.getUTCSeconds());

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function getZonedParts(value: Date, timezone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatLocalDate(value: Date, timezone: string): string {
  const parts = getZonedParts(value, timezone);
  return `${parts.year}${parts.month}${parts.day}`;
}

function formatLocalDateTime(value: Date, timezone: string): string {
  const parts = getZonedParts(value, timezone);
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

function utf8ByteLength(value: string): number {
  const codePoint = value.codePointAt(0) ?? 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function foldContentLine(line: string): string[] {
  const folded: string[] = [];
  let segment = '';
  let segmentBytes = 0;

  for (const character of line) {
    const characterBytes = utf8ByteLength(character);
    if (segmentBytes + characterBytes > 75) {
      folded.push(segment);
      segment = ` ${character}`;
      segmentBytes = 1 + characterBytes;
    } else {
      segment += character;
      segmentBytes += characterBytes;
    }
  }

  folded.push(segment);
  return folded;
}

function pushContentLine(lines: string[], line: string): void {
  lines.push(...foldContentLine(line));
}

function formatDuration(minutes: number): string {
  const prefix = minutes < 0 ? '-' : '';
  let remainingMinutes = Math.abs(minutes);
  const days = Math.floor(remainingMinutes / 1440);
  remainingMinutes %= 1440;
  const hours = Math.floor(remainingMinutes / 60);
  const minuteRemainder = remainingMinutes % 60;
  const datePart = days ? `${days}D` : '';
  const timePart =
    hours || minuteRemainder || !days
      ? `T${hours ? `${hours}H` : ''}${minuteRemainder ? `${minuteRemainder}M` : hours ? '' : '0M'}`
      : '';
  return `${prefix}P${datePart}${timePart}`;
}

function appendAlarm(lines: string[], alarm: EventAlarm, eventTitle: string): void {
  const trigger = alarm.absoluteAt
    ? `TRIGGER;VALUE=DATE-TIME:${formatUtcDateTime(alarm.absoluteAt)}`
    : alarm.relativeOffsetMinutes !== null
      ? `TRIGGER:${formatDuration(alarm.relativeOffsetMinutes)}`
      : null;
  if (!trigger) return;

  pushContentLine(lines, 'BEGIN:VALARM');
  pushContentLine(lines, 'ACTION:DISPLAY');
  pushContentLine(lines, `DESCRIPTION:${escapeText(eventTitle)}`);
  pushContentLine(lines, trigger);
  pushContentLine(lines, 'END:VALARM');
}

function appendRecurrence(lines: string[], event: BearingEvent): void {
  if (!event.recurrenceRule) return;

  const weekdayCodes = {
    sunday: 'SU',
    monday: 'MO',
    tuesday: 'TU',
    wednesday: 'WE',
    thursday: 'TH',
    friday: 'FR',
    saturday: 'SA',
  } as const;
  const values = [
    `FREQ=${event.recurrenceRule.frequency.toUpperCase()}`,
    `INTERVAL=${event.recurrenceRule.interval}`,
  ];
  if (event.recurrenceRule.weekdays.length > 0) {
    values.push(`BYDAY=${event.recurrenceRule.weekdays.map((day) => weekdayCodes[day]).join(',')}`);
  }
  if (event.recurrenceRule.occurrenceCount) {
    values.push(`COUNT=${event.recurrenceRule.occurrenceCount}`);
  } else if (event.recurrenceRule.endAt) {
    values.push(
      `UNTIL=${
        event.allDay
          ? formatLocalDate(event.recurrenceRule.endAt, event.timezone)
          : formatUtcDateTime(event.recurrenceRule.endAt)
      }`,
    );
  }
  pushContentLine(lines, `RRULE:${values.join(';')}`);
}

function isBearingEvent(event: CalendarDisplayEvent): event is BearingEvent {
  return event.ownership === 'bearing';
}

export function serializeEventsToIcs(events: readonly CalendarDisplayEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bearing//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events
    .filter(isBearingEvent)
    .filter((event) => event.status !== 'canceled')
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .forEach((event) => {
      pushContentLine(lines, 'BEGIN:VEVENT');
      pushContentLine(lines, `UID:${escapeText(`bearing-${event.id}`)}`);
      pushContentLine(lines, `DTSTAMP:${formatUtcDateTime(event.updatedAt)}`);
      if (event.allDay) {
        pushContentLine(
          lines,
          `DTSTART;VALUE=DATE:${formatLocalDate(event.startAt, event.timezone)}`,
        );
        pushContentLine(lines, `DTEND;VALUE=DATE:${formatLocalDate(event.endAt, event.timezone)}`);
      } else if (event.timezone === 'UTC') {
        pushContentLine(lines, `DTSTART:${formatUtcDateTime(event.startAt)}`);
        pushContentLine(lines, `DTEND:${formatUtcDateTime(event.endAt)}`);
      } else {
        pushContentLine(
          lines,
          `DTSTART;TZID=${event.timezone}:${formatLocalDateTime(event.startAt, event.timezone)}`,
        );
        pushContentLine(
          lines,
          `DTEND;TZID=${event.timezone}:${formatLocalDateTime(event.endAt, event.timezone)}`,
        );
      }
      pushContentLine(lines, `SUMMARY:${escapeText(event.title)}`);
      pushContentLine(lines, `DESCRIPTION:${escapeText(event.description)}`);
      if (event.location) pushContentLine(lines, `LOCATION:${escapeText(event.location)}`);
      if (event.url) pushContentLine(lines, `URL:${event.url.replace(/\r|\n/g, '')}`);
      pushContentLine(
        lines,
        event.availability === 'free' ? 'TRANSP:TRANSPARENT' : 'TRANSP:OPAQUE',
      );
      pushContentLine(lines, `X-BEARING-TIMEZONE:${escapeText(event.timezone)}`);
      pushContentLine(lines, `X-BEARING-STATUS:${event.status.toUpperCase()}`);
      pushContentLine(lines, `X-BEARING-AVAILABILITY:${event.availability.toUpperCase()}`);

      appendRecurrence(lines, event);
      event.alarms.forEach((alarm) => appendAlarm(lines, alarm, event.title));
      if (event.goalId) pushContentLine(lines, `X-BEARING-GOAL-ID:${escapeText(event.goalId)}`);
      if (event.stepId) pushContentLine(lines, `X-BEARING-STEP-ID:${escapeText(event.stepId)}`);

      pushContentLine(lines, 'END:VEVENT');
    });

  pushContentLine(lines, 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
