export type EventStatus = 'scheduled' | 'completed' | 'canceled';
export type EventAvailability = 'busy' | 'free' | 'tentative' | 'unavailable' | 'not-supported';
export type EventRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventWeekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

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
  alarms: EventAlarm[];
  availability: EventAvailability;
  url: string | null;
  status: EventStatus;
};

export type BearingEvent = CalendarDisplayFields & {
  ownership: 'bearing';
  userId: string;
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

export type UpdateEventInput = Partial<CreateEventInput & { status: EventStatus }>;

export type CalendarUiState = 'loading' | 'error' | 'empty' | 'ready';

export type ViewMode = 'day' | 'week' | 'month';
