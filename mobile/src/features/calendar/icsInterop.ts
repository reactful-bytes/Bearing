import { CalendarEvent } from './calendarTypes';

export type ParsedIcsEvent = {
  uid: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
};

export type ParsedIcsCalendarResult = {
  events: ParsedIcsEvent[];
  skippedEntries: number;
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
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

function parseUtcDateTime(value: string): Date | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) {
    return null;
  }

  const parsed = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    ),
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseFloatingDateTime(value: string): Date | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }

  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function unfoldLines(content: string): string[] {
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded: string[] = [];

  rawLines.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
      return;
    }

    unfolded.push(line);
  });

  return unfolded;
}

function getPropertyLine(
  lines: string[],
  propertyName: string,
): { value: string; parameters: Record<string, string> } | null {
  const prefix = `${propertyName}`;

  for (const line of lines) {
    if (!line.startsWith(prefix) || !line.includes(':')) {
      continue;
    }

    const [left, ...rest] = line.split(':');
    const value = rest.join(':');
    const [, ...parameterParts] = left.split(';');
    const parameters: Record<string, string> = {};

    parameterParts.forEach((part) => {
      const [key, parameterValue] = part.split('=');
      if (key && parameterValue) {
        parameters[key.toUpperCase()] = parameterValue;
      }
    });

    return { value, parameters };
  }

  return null;
}

function parseEventBlock(lines: string[], fallbackIndex: number): ParsedIcsEvent | null {
  if (lines.some((line) => line.startsWith('RRULE'))) {
    return null;
  }

  const dtStartLine = getPropertyLine(lines, 'DTSTART');
  const dtEndLine = getPropertyLine(lines, 'DTEND');
  const summaryLine = getPropertyLine(lines, 'SUMMARY');

  if (!dtStartLine || !dtEndLine || !summaryLine) {
    return null;
  }

  if (
    dtStartLine.parameters.VALUE === 'DATE' ||
    dtEndLine.parameters.VALUE === 'DATE' ||
    !dtStartLine.value.includes('T') ||
    !dtEndLine.value.includes('T')
  ) {
    return null;
  }

  const parseDate = (value: string): Date | null =>
    value.endsWith('Z') ? parseUtcDateTime(value) : parseFloatingDateTime(value);

  const startAt = parseDate(dtStartLine.value);
  const endAt = parseDate(dtEndLine.value);

  if (!startAt || !endAt || endAt <= startAt) {
    return null;
  }

  const uidLine = getPropertyLine(lines, 'UID');
  const descriptionLine = getPropertyLine(lines, 'DESCRIPTION');
  const timezoneLine = getPropertyLine(lines, 'X-BEARING-TIMEZONE');
  const timezone =
    timezoneLine?.value ||
    dtStartLine.parameters.TZID ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';

  return {
    uid: uidLine?.value ? unescapeText(uidLine.value) : `ics-import-${fallbackIndex}`,
    title: unescapeText(summaryLine.value),
    description: descriptionLine?.value ? unescapeText(descriptionLine.value) : '',
    startAt,
    endAt,
    timezone,
  };
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
      lines.push(`UID:${escapeText(event.externalEventId ?? `bearing-${event.id}`)}`);
      lines.push(`DTSTAMP:${formatUtcDateTime(event.updatedAt)}`);
      lines.push(`DTSTART:${formatUtcDateTime(event.startAt)}`);
      lines.push(`DTEND:${formatUtcDateTime(event.endAt)}`);
      lines.push(`SUMMARY:${escapeText(event.title)}`);
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
      lines.push(`X-BEARING-TIMEZONE:${escapeText(event.timezone)}`);
      lines.push(`X-BEARING-SOURCE:${escapeText(event.source)}`);

      if (event.goalId) {
        lines.push(`X-BEARING-GOAL-ID:${escapeText(event.goalId)}`);
      }

      if (event.stepId) {
        lines.push(`X-BEARING-STEP-ID:${escapeText(event.stepId)}`);
      }

      lines.push('END:VEVENT');
    });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function parseIcsCalendar(content: string): ParsedIcsCalendarResult {
  const lines = unfoldLines(content);
  const events: ParsedIcsEvent[] = [];
  let skippedEntries = 0;
  let currentEventLines: string[] = [];
  let inEvent = false;

  lines.forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      currentEventLines = [];
      inEvent = true;
      return;
    }

    if (line === 'END:VEVENT') {
      const parsedEvent = parseEventBlock(currentEventLines, events.length + skippedEntries + 1);
      if (parsedEvent) {
        events.push(parsedEvent);
      } else {
        skippedEntries += 1;
      }

      inEvent = false;
      currentEventLines = [];
      return;
    }

    if (inEvent) {
      currentEventLines.push(line);
    }
  });

  return { events, skippedEntries };
}
