import { Linking, Platform } from 'react-native';

import {
  DeviceCalendar,
  DeviceCalendarEvent,
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
  getPermissionState(): Promise<DeviceCalendarPermissionState>;
  requestPermission(): Promise<DeviceCalendarPermissionState>;
  getCalendars(): Promise<DeviceCalendar[]>;
  listEvents(calendarIds: string[], startDate: Date, endDate: Date): Promise<DeviceCalendarEvent[]>;
  createEvent(calendarId: string, input: DeviceCalendarEventInput): Promise<DeviceCalendarEvent>;
  updateEvent(eventId: string, fields: DeviceCalendarEventUpdate): Promise<void>;
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

function normalizeEvent(event: NativeCalendarEvent): DeviceCalendarEvent {
  return {
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    notes: event.notes ?? '',
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    allDay: event.allDay,
  };
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
        return normalizeEvent(await calendar.createEvent(input));
      }),
    updateEvent: (eventId, fields) =>
      withModule(async (module) => {
        const event = await module.ExpoCalendarEvent.get(eventId);
        await event.update(fields);
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
