export type EventStatus = 'scheduled' | 'completed' | 'canceled';
export type EventAvailability = 'busy' | 'free' | 'tentative' | 'unavailable' | 'not-supported';
export type EventRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type EventRecurrenceRule = {
  frequency: EventRecurrenceFrequency;
  interval: number;
  endAt: Date | null;
  occurrenceCount: number | null;
};

export type EventAlarm = {
  absoluteAt: Date | null;
  relativeOffsetMinutes: number | null;
};

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

export type ViewMode = 'day' | 'month';
