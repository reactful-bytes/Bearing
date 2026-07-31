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

export type DeviceCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  notes: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
};

export type DeviceCalendarEventInput = {
  title: string;
  notes?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  timeZone?: string;
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
