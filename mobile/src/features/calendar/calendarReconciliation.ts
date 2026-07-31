import type { EventAlarm, EventAvailability, EventRecurrenceRule } from './calendarTypes';

export type ReconciliationEventFields = {
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  allDay: boolean;
  location: string;
  recurrenceRule: EventRecurrenceRule | null;
  alarms: EventAlarm[];
  availability: EventAvailability;
  url: string | null;
};

export type CalendarPublicationMarker = {
  version: 1;
  linkId: string;
  commonHash: string;
};

export type ReconciliationDecision =
  | { action: 'none'; winningHash: string; reason: 'unchanged' | 'already-equal' }
  | { action: 'update-device'; winningHash: string; reason: 'bearing-only-change' }
  | {
      action: 'update-bearing';
      winningHash: string;
      reason: 'device-only-change' | 'simultaneous-device-wins' | 'unknown-device-wins';
    };

const MARKER_PATTERN = /\[\[bearing:v1:([A-Za-z0-9_-]{16,128}):(h1-[a-f0-9]{16})\]\]$/;
const MARKER_SEPARATOR = '\n\n';

function canonicalValue(fields: ReconciliationEventFields): string {
  return JSON.stringify({
    alarms: fields.alarms.map((alarm) => ({
      absoluteAt: alarm.absoluteAt?.toISOString() ?? null,
      relativeOffsetMinutes: alarm.relativeOffsetMinutes,
    })),
    allDay: fields.allDay,
    availability: fields.availability,
    description: parsePublicationMarker(fields.description).userNotes,
    endAt: fields.endAt.toISOString(),
    location: fields.location,
    recurrenceRule: fields.recurrenceRule
      ? {
          endAt: fields.recurrenceRule.endAt?.toISOString() ?? null,
          frequency: fields.recurrenceRule.frequency,
          interval: fields.recurrenceRule.interval,
          occurrenceCount: fields.recurrenceRule.occurrenceCount,
        }
      : null,
    startAt: fields.startAt.toISOString(),
    timezone: fields.timezone,
    title: fields.title,
    url: fields.url,
  });
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, '0');
}

export function canonicalCalendarFieldHash(fields: ReconciliationEventFields): string {
  return `h1-${fnv1a64(canonicalValue(fields))}`;
}

export function createOpaqueLinkId(random: () => number = Math.random): string {
  let value = '';
  for (let index = 0; index < 4; index += 1) {
    value += Math.floor(random() * 0x1_0000_0000)
      .toString(16)
      .padStart(8, '0');
  }
  return value;
}

export function serializePublicationMarker(marker: CalendarPublicationMarker): string {
  return `[[bearing:v${marker.version}:${marker.linkId}:${marker.commonHash}]]`;
}

export function parsePublicationMarker(notes: string): {
  marker: CalendarPublicationMarker | null;
  userNotes: string;
} {
  const match = MARKER_PATTERN.exec(notes);
  if (!match || match.index === undefined) {
    return { marker: null, userNotes: notes };
  }

  const markerStart =
    match.index >= MARKER_SEPARATOR.length &&
    notes.slice(match.index - MARKER_SEPARATOR.length, match.index) === MARKER_SEPARATOR
      ? match.index - MARKER_SEPARATOR.length
      : match.index;

  return {
    marker: {
      version: 1,
      linkId: match[1],
      commonHash: match[2],
    },
    userNotes: notes.slice(0, markerStart),
  };
}

export function replacePublicationMarker(notes: string, marker: CalendarPublicationMarker): string {
  const userNotes = parsePublicationMarker(notes).userNotes;
  return `${userNotes}${MARKER_SEPARATOR}${serializePublicationMarker(marker)}`;
}

export function decideCalendarReconciliation(
  bearingHash: string,
  deviceHash: string,
  lastCommonHash: string | null,
): ReconciliationDecision {
  if (bearingHash === deviceHash) {
    return {
      action: 'none',
      winningHash: bearingHash,
      reason: bearingHash === lastCommonHash ? 'unchanged' : 'already-equal',
    };
  }

  if (!lastCommonHash) {
    return { action: 'update-bearing', winningHash: deviceHash, reason: 'unknown-device-wins' };
  }

  const bearingChanged = bearingHash !== lastCommonHash;
  const deviceChanged = deviceHash !== lastCommonHash;

  if (bearingChanged && !deviceChanged) {
    return { action: 'update-device', winningHash: bearingHash, reason: 'bearing-only-change' };
  }

  if (!bearingChanged && deviceChanged) {
    return { action: 'update-bearing', winningHash: deviceHash, reason: 'device-only-change' };
  }

  return {
    action: 'update-bearing',
    winningHash: deviceHash,
    reason: 'simultaneous-device-wins',
  };
}
