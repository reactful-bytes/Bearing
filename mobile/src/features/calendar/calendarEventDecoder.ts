import {
  CalendarPublicationMetadata,
  CalendarPublicationStatus,
  CalendarEvent,
  EventAlarm,
  EventAvailability,
  EventRecurrenceRule,
  EventStatus,
  createUnpublishedMetadata,
} from './calendarTypes';

type TimestampLike = { toDate: () => Date };

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as TimestampLike).toDate();
  }
  return null;
}

function decodeRecurrenceRule(value: unknown): EventRecurrenceRule | null {
  if (!value || typeof value !== 'object') return null;
  const rule = value as Partial<EventRecurrenceRule> & { endAt?: unknown };
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency ?? '')) return null;

  return {
    frequency: rule.frequency as EventRecurrenceRule['frequency'],
    interval: typeof rule.interval === 'number' && rule.interval > 0 ? rule.interval : 1,
    endAt: toDate(rule.endAt),
    occurrenceCount:
      typeof rule.occurrenceCount === 'number' && rule.occurrenceCount > 0
        ? rule.occurrenceCount
        : null,
  };
}

function decodeAlarms(value: unknown): EventAlarm[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const alarm = candidate as { absoluteAt?: unknown; relativeOffsetMinutes?: unknown };
    return [
      {
        absoluteAt: toDate(alarm.absoluteAt),
        relativeOffsetMinutes:
          typeof alarm.relativeOffsetMinutes === 'number' ? alarm.relativeOffsetMinutes : null,
      },
    ];
  });
}

function decodeAvailability(value: unknown): EventAvailability {
  return ['busy', 'free', 'tentative', 'unavailable', 'not-supported'].includes(String(value))
    ? (value as EventAvailability)
    : 'busy';
}

function decodePublication(value: unknown): CalendarPublicationMetadata {
  const fallback = createUnpublishedMetadata();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;

  const publication = value as Record<string, unknown>;
  const status = ['unpublished', 'publishing', 'published', 'failed', 'deleting'].includes(
    String(publication.status),
  )
    ? (publication.status as CalendarPublicationStatus)
    : fallback.status;

  return {
    status,
    markerId: typeof publication.markerId === 'string' ? publication.markerId : null,
    commonHash: typeof publication.commonHash === 'string' ? publication.commonHash : null,
    lastError: typeof publication.lastError === 'string' ? publication.lastError : null,
    retryable: publication.retryable === true,
    deletionIntent: publication.deletionIntent === true,
  };
}

export function decodeCalendarEventData(id: string, data: Record<string, unknown>): CalendarEvent {
  return {
    ownership: 'bearing',
    id,
    userId: data.userId as string,
    title: data.title as string,
    description: data.description as string,
    startAt: (data.startAt as TimestampLike).toDate(),
    endAt: (data.endAt as TimestampLike).toDate(),
    timezone: data.timezone as string,
    allDay: data.allDay === true,
    location: typeof data.location === 'string' ? data.location : '',
    recurrenceRule: decodeRecurrenceRule(data.recurrenceRule),
    alarms: decodeAlarms(data.alarms),
    availability: decodeAvailability(data.availability),
    url: typeof data.url === 'string' ? data.url : null,
    goalId: (data.goalId as string | null) ?? null,
    stepId: (data.stepId as string | null) ?? null,
    status: data.status as EventStatus,
    publication: decodePublication(data.publication),
    createdAt: (data.createdAt as TimestampLike).toDate(),
    updatedAt: (data.updatedAt as TimestampLike).toDate(),
  };
}
