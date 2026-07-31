import type {
  EventAlarm,
  EventAvailability,
  EventRecurrenceRule,
  EventStatus,
} from './calendarTypes';

export type DeviceCalendarPermissionState =
  'unavailable' | 'undetermined' | 'granted' | 'denied' | 'blocked';

export type DeviceCalendar = {
  id: string;
  title: string;
  color: string | null;
  sourceLabel: string;
  isVisible: boolean;
  isPrimary: boolean;
  isSynced: boolean;
  accessLevel: string | null;
  allowsModifications: boolean;
};

export type DeviceCalendarEventRecord = {
  id: string;
  calendarId: string;
  title: string;
  notes: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location: string;
  timeZone: string;
  url: string | null;
  alarms: EventAlarm[];
  recurrenceRule: EventRecurrenceRule | null;
  availability: EventAvailability;
  status: EventStatus;
};

export type DeviceCalendarEventInput = {
  title?: string;
  notes?: string | null;
  startDate?: Date;
  endDate?: Date;
  allDay?: boolean;
  timeZone?: string | null;
  location?: string | null;
  recurrenceRule?: {
    frequency: string;
    interval: number;
    endDate?: Date;
    occurrence?: number;
  } | null;
  alarms?: { absoluteDate?: string; relativeOffset?: number }[];
  availability?: string;
  url?: string | null;
};

export type DeviceCalendarEventUpdate = Partial<DeviceCalendarEventInput>;

export type DeviceCalendarLink = {
  calendarId: string;
  eventId: string;
  updatedAt: string;
};

export type DeviceCalendarSettings = {
  selectedCalendarIds: string[];
  defaultCalendarId: string | null;
  linkCache: Record<string, DeviceCalendarLink>;
};

export type ValidatedDeviceCalendarSettings = DeviceCalendarSettings & {
  removedCalendarIds: string[];
  defaultCalendarWasRemoved: boolean;
};
