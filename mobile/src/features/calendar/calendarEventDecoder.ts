import {
  CalendarPublicationMetadata,
  CalendarPublicationStatus,
  CalendarEvent,
  EVENT_WEEKDAYS,
  EventAlarm,
  EventAvailability,
  EventRecurrenceRule,
  EventWeekday,
  EventStatus,
  CalendarRecurrenceOverride,
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
  const weekdays = Array.isArray(rule.weekdays)
    ? EVENT_WEEKDAYS.filter((weekday) => rule.weekdays?.includes(weekday as EventWeekday))
    : [];

  return {
    frequency: rule.frequency as EventRecurrenceRule['frequency'],
    interval: typeof rule.interval === 'number' && rule.interval > 0 ? rule.interval : 1,
    endAt: toDate(rule.endAt),
    occurrenceCount:
      typeof rule.occurrenceCount === 'number' && rule.occurrenceCount > 0
        ? rule.occurrenceCount
        : null,
    weekdays: rule.frequency === 'weekly' ? weekdays : [],
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

function decodeRecurrenceOverrides(value: unknown): Record<string, CalendarRecurrenceOverride> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const overrides: Record<string, CalendarRecurrenceOverride> = {};
  for (const [date, candidate] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !candidate || typeof candidate !== 'object') continue;
    const data = candidate as Record<string, unknown>;
    const override: CalendarRecurrenceOverride = {};
    if (typeof data.title === 'string') override.title = data.title;
    if (typeof data.description === 'string') override.description = data.description;
    const startAt = toDate(data.startAt);
    if (startAt) override.startAt = startAt;
    const endAt = toDate(data.endAt);
    if (endAt) override.endAt = endAt;
    if (typeof data.timezone === 'string') override.timezone = data.timezone;
    if (typeof data.allDay === 'boolean') override.allDay = data.allDay;
    if (typeof data.location === 'string') override.location = data.location;
    if (Array.isArray(data.alarms)) override.alarms = decodeAlarms(data.alarms);
    if (
      ['busy', 'free', 'tentative', 'unavailable', 'not-supported'].includes(
        String(data.availability),
      )
    ) {
      override.availability = data.availability as EventAvailability;
    }
    if (typeof data.url === 'string' || data.url === null) override.url = data.url;
    if (['scheduled', 'completed', 'canceled'].includes(String(data.status))) {
      override.status = data.status as EventStatus;
    }
    overrides[date] = override;
  }
  return overrides;
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
    recurrenceOverrides: decodeRecurrenceOverrides(data.recurrenceOverrides),
    excludedOccurrenceDates: Array.isArray(data.excludedOccurrenceDates)
      ? [
          ...new Set(
            data.excludedOccurrenceDates.filter(
              (date): date is string =>
                typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
            ),
          ),
        ]
      : [],
    alarms: decodeAlarms(data.alarms),
    availability: decodeAvailability(data.availability),
    url: typeof data.url === 'string' ? data.url : null,
    sourceTaskId: typeof data.sourceTaskId === 'string' ? data.sourceTaskId : null,
    goalId: (data.goalId as string | null) ?? null,
    stepId: (data.stepId as string | null) ?? null,
    status: data.status as EventStatus,
    publication: decodePublication(data.publication),
    createdAt: (data.createdAt as TimestampLike).toDate(),
    updatedAt: (data.updatedAt as TimestampLike).toDate(),
  };
}
