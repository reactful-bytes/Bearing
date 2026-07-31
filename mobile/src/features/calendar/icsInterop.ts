import { CalendarEvent } from './calendarTypes';

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatUtcDateTime(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  const hour = String(value.getUTCHours()).padStart(2, '0');
  const minute = String(value.getUTCMinutes()).padStart(2, '0');
  const second = String(value.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

export function serializeEventsToIcs(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bearing//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events
    .filter((event) => event.status !== 'canceled')
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .forEach((event) => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${escapeText(`bearing-${event.id}`)}`);
      lines.push(`DTSTAMP:${formatUtcDateTime(event.updatedAt)}`);
      lines.push(`DTSTART:${formatUtcDateTime(event.startAt)}`);
      lines.push(`DTEND:${formatUtcDateTime(event.endAt)}`);
      lines.push(`SUMMARY:${escapeText(event.title)}`);
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
      lines.push(`X-BEARING-TIMEZONE:${escapeText(event.timezone)}`);

      if (event.goalId) lines.push(`X-BEARING-GOAL-ID:${escapeText(event.goalId)}`);
      if (event.stepId) lines.push(`X-BEARING-STEP-ID:${escapeText(event.stepId)}`);

      lines.push('END:VEVENT');
    });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
