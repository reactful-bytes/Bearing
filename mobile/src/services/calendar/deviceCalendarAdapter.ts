import { Linking, Platform } from 'react-native';

import {
  CreateEventInput,
  EventAlarm,
  EventAvailability,
  EventRecurrenceRule,
  EventStatus,
  UpdateEventInput,
} from '../../features/calendar/calendarTypes';
import {
  DeviceCalendar,
  DeviceCalendarEventRecord,
  DeviceCalendarEventInput,
  DeviceCalendarEventUpdate,
  DeviceCalendarPermissionState,
} from '../../features/calendar/deviceCalendarTypes';

type CalendarPermissionResponse = {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
};

type NativeCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  notes: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay: boolean;
  location: string | null;
  timeZone: string;
  url?: string;
  alarms: { absoluteDate?: string; relativeOffset?: number }[];
  recurrenceRule: {
    frequency: string;
    interval?: number;
    endDate?: Date | string | null;
    occurrence?: number | null;
  } | null;
  availability: string;
  status: string;
  update(details: DeviceCalendarEventUpdate): Promise<void>;
  delete(): Promise<void>;
};

type NativeCalendar = {
  id: string;
  title: string;
  color?: string;
  source: { name: string };
  isVisible?: boolean;
  isPrimary?: boolean;
  isSynced?: boolean;
  accessLevel?: string;
  allowsModifications: boolean;
  createEvent(details: DeviceCalendarEventInput): Promise<NativeCalendarEvent>;
};

export type DeviceCalendarModule = {
  EntityTypes: { EVENT: string };
  ExpoCalendar: { get(calendarId: string): Promise<NativeCalendar> };
  ExpoCalendarEvent: { get(eventId: string): Promise<NativeCalendarEvent> };
  getCalendarPermissions(writeOnly?: boolean): Promise<CalendarPermissionResponse>;
  requestCalendarPermissions(writeOnly?: boolean): Promise<CalendarPermissionResponse>;
  getCalendars(entityType?: string): Promise<NativeCalendar[]>;
  listEvents(calendars: string[], startDate: Date, endDate: Date): Promise<NativeCalendarEvent[]>;
};

export type DeviceCalendarAdapter = {
  capabilities: {
    recurringEventMutationScopes: readonly [];
  };
  getPermissionState(): Promise<DeviceCalendarPermissionState>;
  requestPermission(): Promise<DeviceCalendarPermissionState>;
  getCalendars(): Promise<DeviceCalendar[]>;
  listEvents(
    calendarIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<DeviceCalendarEventRecord[]>;
  createEvent(calendarId: string, input: CreateEventInput): Promise<DeviceCalendarEventRecord>;
  updateEvent(eventId: string, fields: UpdateEventInput): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  openSettings(): Promise<void>;
};

type ModuleLoader = () => Promise<DeviceCalendarModule>;

function normalizePermission(response: CalendarPermissionResponse): DeviceCalendarPermissionState {
  if (response.granted || response.status === 'granted') {
    return 'granted';
  }

  if (response.status === 'undetermined') {
    return 'undetermined';
  }

  return response.canAskAgain ? 'denied' : 'blocked';
}

function normalizeCalendar(calendar: NativeCalendar): DeviceCalendar {
  return {
    id: calendar.id,
    title: calendar.title || 'Untitled calendar',
    color: calendar.color ?? null,
    sourceLabel: calendar.source?.name || 'Device',
    isVisible: calendar.isVisible !== false,
    isPrimary: calendar.isPrimary === true,
    isSynced: calendar.isSynced !== false,
    accessLevel: calendar.accessLevel ?? null,
    allowsModifications: calendar.allowsModifications,
  };
}

function normalizeAvailability(value: string): EventAvailability {
  if (value === 'notSupported') return 'not-supported';
  return ['busy', 'free', 'tentative', 'unavailable'].includes(value)
    ? (value as EventAvailability)
    : 'busy';
}

function normalizeStatus(value: string): EventStatus {
  return value === 'canceled' ? 'canceled' : 'scheduled';
}

function normalizeRecurrenceRule(
  value: NativeCalendarEvent['recurrenceRule'],
): EventRecurrenceRule | null {
  if (!value || !['daily', 'weekly', 'monthly', 'yearly'].includes(value.frequency)) return null;
  return {
    frequency: value.frequency as EventRecurrenceRule['frequency'],
    interval: value.interval && value.interval > 0 ? value.interval : 1,
    endAt: value.endDate ? new Date(value.endDate) : null,
    occurrenceCount: value.occurrence && value.occurrence > 0 ? value.occurrence : null,
  };
}

function normalizeAlarms(value: NativeCalendarEvent['alarms']): EventAlarm[] {
  return value.map((alarm) => ({
    absoluteAt: alarm.absoluteDate ? new Date(alarm.absoluteDate) : null,
    relativeOffsetMinutes: typeof alarm.relativeOffset === 'number' ? alarm.relativeOffset : null,
  }));
}

function normalizeEvent(event: NativeCalendarEvent): DeviceCalendarEventRecord {
  return {
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    notes: event.notes ?? '',
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    allDay: event.allDay,
    location: event.location ?? '',
    timeZone: event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    url: event.url ?? null,
    alarms: normalizeAlarms(event.alarms ?? []),
    recurrenceRule: normalizeRecurrenceRule(event.recurrenceRule),
    availability: normalizeAvailability(event.availability),
    status: normalizeStatus(event.status),
  };
}

function mapRecurrenceRule(
  recurrenceRule: EventRecurrenceRule | null,
): DeviceCalendarEventInput['recurrenceRule'] {
  if (!recurrenceRule) return null;

  return {
    frequency: recurrenceRule.frequency,
    interval: recurrenceRule.interval,
    ...(recurrenceRule.endAt ? { endDate: recurrenceRule.endAt } : {}),
    ...(recurrenceRule.occurrenceCount ? { occurrence: recurrenceRule.occurrenceCount } : {}),
  };
}

function mapAlarms(alarms: EventAlarm[]): NonNullable<DeviceCalendarEventInput['alarms']> {
  return alarms.map((alarm) => ({
    ...(alarm.absoluteAt ? { absoluteDate: alarm.absoluteAt.toISOString() } : {}),
    ...(alarm.relativeOffsetMinutes !== null
      ? { relativeOffset: alarm.relativeOffsetMinutes }
      : {}),
  }));
}

function mapAvailability(availability: EventAvailability): string {
  return availability === 'not-supported' ? 'notSupported' : availability;
}

function mapEventFields(fields: CreateEventInput | UpdateEventInput): DeviceCalendarEventUpdate {
  const details: DeviceCalendarEventUpdate = {};
  if (fields.title !== undefined) details.title = fields.title;
  if (fields.description !== undefined) details.notes = fields.description || null;
  if (fields.startAt !== undefined) details.startDate = fields.startAt;
  if (fields.endAt !== undefined) details.endDate = fields.endAt;
  if (fields.allDay !== undefined) details.allDay = fields.allDay;
  if (fields.timezone !== undefined) details.timeZone = fields.timezone || null;
  if (fields.location !== undefined) details.location = fields.location || null;
  if (fields.recurrenceRule !== undefined) {
    details.recurrenceRule = mapRecurrenceRule(fields.recurrenceRule);
  }
  if (fields.alarms !== undefined) details.alarms = mapAlarms(fields.alarms);
  if (fields.availability !== undefined) {
    details.availability = mapAvailability(fields.availability);
  }
  if (fields.url !== undefined) details.url = fields.url;
  return details;
}

async function loadExpoCalendarModule(): Promise<DeviceCalendarModule> {
  return (await import('expo-calendar')) as unknown as DeviceCalendarModule;
}

export function createDeviceCalendarAdapter(
  loadModule: ModuleLoader = loadExpoCalendarModule,
  platform: string = Platform.OS,
): DeviceCalendarAdapter {
  const isSupportedPlatform = platform === 'ios' || platform === 'android';

  async function withModule<T>(
    operation: (module: DeviceCalendarModule) => Promise<T>,
  ): Promise<T> {
    if (!isSupportedPlatform) {
      throw new Error('Device calendars are unavailable on this platform.');
    }

    try {
      return await operation(await loadModule());
    } catch (error) {
      throw new Error('Device calendar access is unavailable in this build.', { cause: error });
    }
  }

  return {
    capabilities: {
      recurringEventMutationScopes: [],
    },
    async getPermissionState() {
      if (!isSupportedPlatform) {
        return 'unavailable';
      }

      try {
        return await withModule(async (module) =>
          normalizePermission(await module.getCalendarPermissions(false)),
        );
      } catch {
        return 'unavailable';
      }
    },
    async requestPermission() {
      if (!isSupportedPlatform) {
        return 'unavailable';
      }

      try {
        return await withModule(async (module) =>
          normalizePermission(await module.requestCalendarPermissions(false)),
        );
      } catch {
        return 'unavailable';
      }
    },
    getCalendars: () =>
      withModule(async (module) =>
        (await module.getCalendars(module.EntityTypes.EVENT))
          .map(normalizeCalendar)
          .sort((left, right) => left.title.localeCompare(right.title)),
      ),
    listEvents: (calendarIds, startDate, endDate) =>
      withModule(async (module) =>
        (await module.listEvents(calendarIds, startDate, endDate)).map(normalizeEvent),
      ),
    createEvent: (calendarId, input) =>
      withModule(async (module) => {
        const calendar = await module.ExpoCalendar.get(calendarId);
        return normalizeEvent(await calendar.createEvent(mapEventFields(input)));
      }),
    updateEvent: (eventId, fields) =>
      withModule(async (module) => {
        const event = await module.ExpoCalendarEvent.get(eventId);
        await event.update(mapEventFields(fields));
      }),
    deleteEvent: (eventId) =>
      withModule(async (module) => {
        const event = await module.ExpoCalendarEvent.get(eventId);
        await event.delete();
      }),
    openSettings: () => Linking.openSettings(),
  };
}

export const deviceCalendarAdapter = createDeviceCalendarAdapter();
