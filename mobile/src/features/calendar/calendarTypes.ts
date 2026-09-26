export type EventStatus = 'scheduled' | 'completed' | 'canceled';
export type EventAvailability = 'busy' | 'free' | 'tentative' | 'unavailable' | 'not-supported';
export type EventRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventWeekday =
  'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export const EVENT_WEEKDAYS: readonly EventWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export type EventRecurrenceRule = {
  frequency: EventRecurrenceFrequency;
  interval: number;
  endAt: Date | null;
  occurrenceCount: number | null;
  weekdays: EventWeekday[];
};

export type CalendarDeletionScope = 'instance' | 'following' | 'series';
export type CalendarUpdateScope = 'instance' | 'following' | 'series';

export type CalendarRecurrenceOverride = Partial<
  Pick<
    CreateEventInput,
    | 'title'
    | 'description'
    | 'startAt'
    | 'endAt'
    | 'timezone'
    | 'allDay'
    | 'location'
    | 'alarms'
    | 'availability'
    | 'url'
  > & { status: EventStatus }
>;

export type EventAlarm = {
  absoluteAt: Date | null;
  relativeOffsetMinutes: number | null;
};

export type CalendarPublicationStatus =
  'unpublished' | 'publishing' | 'published' | 'failed' | 'deleting';

export type CalendarPublicationMetadata = {
  status: CalendarPublicationStatus;
  markerId: string | null;
  commonHash: string | null;
  lastError: string | null;
  retryable: boolean;
  deletionIntent: boolean;
};

export type CreateEventOptions = {
  publishToDevice: boolean;
};

export function createUnpublishedMetadata(): CalendarPublicationMetadata {
  return {
    status: 'unpublished',
    markerId: null,
    commonHash: null,
    lastError: null,
    retryable: false,
    deletionIntent: false,
  };
}

type CalendarDisplayFields = {
  id: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  allDay: boolean;
  location: string;
  recurrenceRule: EventRecurrenceRule | null;
  /** Master start retained only on projected occurrences. */
  recurrenceStartAt?: Date;
  /** Original scheduled date key for this projected recurrence occurrence. */
  recurrenceInstanceDate?: string;
  /** Local recurrence dates removed from this series, formatted as YYYY-MM-DD. */
  excludedOccurrenceDates?: string[];
  /** Per-occurrence edits keyed by the original scheduled date. */
  recurrenceOverrides?: Record<string, CalendarRecurrenceOverride>;
  alarms: EventAlarm[];
  availability: EventAvailability;
  url: string | null;
  status: EventStatus;
};

export type BearingEvent = CalendarDisplayFields & {
  ownership: 'bearing';
  userId: string;
  sourceTaskId: string | null;
  goalId: string | null;
  stepId: string | null;
  publication: CalendarPublicationMetadata;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceCalendarEvent = CalendarDisplayFields & {
  ownership: 'device';
  nativeEventId: string;
  calendarId: string;
  calendarTitle: string;
  calendarColor: string | null;
  sourceLabel: string;
  allowsModifications: boolean;
};

export type CalendarDisplayEvent = BearingEvent | DeviceCalendarEvent;
export type CalendarEvent = BearingEvent;

export function eventOverlapsCalendarDay(event: CalendarDisplayEvent, date: Date): boolean {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return event.startAt < dayEnd && event.endAt > dayStart;
}

export type CreateEventInput = {
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  allDay?: boolean;
  location?: string;
  recurrenceRule?: EventRecurrenceRule | null;
  alarms?: EventAlarm[];
  availability?: EventAvailability;
  url?: string | null;
  goalId?: string | null;
  stepId?: string | null;
};

export type UpdateEventInput = Partial<
  CreateEventInput & {
    status: EventStatus;
    excludedOccurrenceDates: string[];
    recurrenceOverrides: Record<string, CalendarRecurrenceOverride>;
  }
>;

export type CalendarUiState = 'loading' | 'error' | 'empty' | 'ready';

export type ViewMode = 'day' | 'week' | 'month';
