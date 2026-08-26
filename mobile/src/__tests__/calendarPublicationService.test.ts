import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  CalendarPublicationDependencies,
  createCalendarPublicationService,
  findRediscoveredLinks,
} from '../features/calendar/calendarPublicationService';
import {
  BearingEvent,
  CreateEventInput,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
import {
  CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE,
  DeviceCalendarAdapter,
} from '../services/calendar/deviceCalendarAdapter';
import { canonicalCalendarFieldHash } from '../features/calendar/calendarReconciliation';

jest.mock('../services/firebase/firebaseEvents', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  updateEventPublication: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../services/calendar/deviceCalendarSettings', () => ({
  loadDeviceCalendarSettings: jest.fn(),
  saveDeviceCalendarLink: jest.fn(),
  removeDeviceCalendarLink: jest.fn(),
}));

jest.mock('../services/calendar/deviceCalendarAdapter', () => ({
  CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE:
    'Custom weekday recurrence is unavailable for Android device calendars. Keep this event in Bearing or choose Weekly.',
  deviceCalendarAdapter: {},
}));

const startAt = new Date('2026-07-31T13:00:00.000Z');
const endAt = new Date('2026-07-31T14:00:00.000Z');
const input: CreateEventInput = {
  title: 'Planning',
  description: 'Bring notes.',
  startAt,
  endAt,
  timezone: 'UTC',
};

function nativeEvent(notes = '') {
  return {
    id: 'native-1',
    calendarId: 'work',
    title: 'Planning',
    notes,
    startDate: startAt,
    endDate: endAt,
    allDay: false,
    location: '',
    timeZone: 'UTC',
    url: null,
    alarms: [],
    recurrenceRule: null,
    availability: 'busy' as const,
    status: 'scheduled' as const,
  };
}

function bearingEvent(overrides: Partial<BearingEvent> = {}): BearingEvent {
  return {
    ownership: 'bearing',
    id: 'bearing-1',
    userId: 'user-1',
    ...input,
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
    ...overrides,
  };
}

function makeAdapter(): DeviceCalendarAdapter {
  return {
    capabilities: { recurringEventMutationScopes: [] },
    getPermissionState: jest.fn(async () => 'granted' as const),
    requestPermission: jest.fn(async () => 'granted' as const),
    getCalendars: jest.fn(async () => []),
    listEvents: jest.fn(async () => []),
    createEvent: jest.fn<DeviceCalendarAdapter['createEvent']>(async (_calendarId, eventInput) =>
      nativeEvent(eventInput.description),
    ),
    lookupEvent: jest.fn(async () => ({ status: 'missing' as const })),
    updateEvent: jest.fn(async () => undefined),
    deleteEvent: jest.fn(async () => undefined),
    openSettings: jest.fn(async () => undefined),
  };
}

function makeDependencies(adapter = makeAdapter()): CalendarPublicationDependencies {
  return {
    adapter,
    createBearingEvent: jest.fn(async () => 'bearing-1'),
    updateBearingEvent: jest.fn(async () => undefined),
    updatePublication: jest.fn(async () => undefined),
    deleteBearingEvent: jest.fn(async () => undefined),
    loadSettings: jest.fn(async () => ({
      selectedCalendarIds: ['work'],
      defaultCalendarId: 'work',
      linkCache: {},
    })),
    saveLink: jest.fn(async () => undefined),
    removeLink: jest.fn(async () => undefined),
    random: () => 0.5,
    now: () => new Date('2026-07-31T15:00:00.000Z'),
  };
}

describe('calendarPublicationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps default-off creation entirely in Firestore', async () => {
    const dependencies = makeDependencies();
    const service = createCalendarPublicationService(dependencies);

    await expect(service.createEvent('user-1', input)).resolves.toEqual({
      eventId: 'bearing-1',
      status: 'unpublished',
    });
    expect(dependencies.createBearingEvent).toHaveBeenCalledWith(
      'user-1',
      input,
      createUnpublishedMetadata(),
    );
    expect(dependencies.adapter.listEvents).not.toHaveBeenCalled();
    expect(dependencies.adapter.createEvent).not.toHaveBeenCalled();
  });

  it('creates Firestore first and leaves an event retryable when native publication fails', async () => {
    const adapter = makeAdapter();
    (adapter.createEvent as jest.MockedFunction<typeof adapter.createEvent>).mockRejectedValue(
      new Error('Permission revoked'),
    );
    const dependencies = makeDependencies(adapter);
    const service = createCalendarPublicationService(dependencies);

    await expect(service.createEvent('user-1', input, { publishToDevice: true })).resolves.toEqual({
      eventId: 'bearing-1',
      status: 'failed',
    });
    expect((dependencies.createBearingEvent as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (adapter.createEvent as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(dependencies.updatePublication).toHaveBeenLastCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ status: 'failed', retryable: true }),
    );
  });

  it('preserves the actionable Android custom recurrence publication error', async () => {
    const adapter = makeAdapter();
    (adapter.createEvent as jest.MockedFunction<typeof adapter.createEvent>).mockRejectedValue(
      new Error(CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE),
    );
    const dependencies = makeDependencies(adapter);
    const service = createCalendarPublicationService(dependencies);

    await expect(service.createEvent('user-1', input, { publishToDevice: true })).resolves.toEqual({
      eventId: 'bearing-1',
      status: 'failed',
    });
    expect(dependencies.updatePublication).toHaveBeenLastCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ lastError: CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE }),
    );
  });

  it('publishes with an opaque marker and persists only the local native link', async () => {
    const dependencies = makeDependencies();
    const service = createCalendarPublicationService(dependencies);

    await expect(service.createEvent('user-1', input, { publishToDevice: true })).resolves.toEqual({
      eventId: 'bearing-1',
      status: 'published',
    });
    expect(dependencies.adapter.createEvent).toHaveBeenCalledWith(
      'work',
      expect.objectContaining({
        description: expect.stringContaining('[[bearing:v1:'),
      }),
    );
    expect(dependencies.saveLink).toHaveBeenCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ calendarId: 'work', eventId: 'native-1' }),
    );
    expect(dependencies.updatePublication).toHaveBeenLastCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ status: 'published', retryable: false }),
    );
  });

  it('publishes an existing converted event without creating another Firestore event', async () => {
    const adapter = makeAdapter();
    (adapter.createEvent as jest.MockedFunction<typeof adapter.createEvent>).mockRejectedValue(
      new Error('Permission revoked'),
    );
    const dependencies = makeDependencies(adapter);
    const service = createCalendarPublicationService(dependencies);

    await expect(service.publishEvent('user-1', 'task-task-1', input)).resolves.toEqual({
      eventId: 'task-task-1',
      status: 'failed',
    });

    expect(dependencies.createBearingEvent).not.toHaveBeenCalled();
    expect(dependencies.updatePublication).toHaveBeenNthCalledWith(
      1,
      'user-1',
      'task-task-1',
      expect.objectContaining({ status: 'publishing', retryable: true }),
    );
    expect(dependencies.updatePublication).toHaveBeenLastCalledWith(
      'user-1',
      'task-task-1',
      expect.objectContaining({ status: 'failed', retryable: true }),
    );
  });

  it('reuses a confirmed local copy on retry instead of creating a duplicate', async () => {
    const adapter = makeAdapter();
    (adapter.lookupEvent as jest.MockedFunction<typeof adapter.lookupEvent>).mockResolvedValue({
      status: 'found',
      event: nativeEvent(),
    });
    const dependencies = makeDependencies(adapter);
    (
      dependencies.loadSettings as jest.MockedFunction<typeof dependencies.loadSettings>
    ).mockResolvedValue({
      selectedCalendarIds: ['work'],
      defaultCalendarId: 'work',
      linkCache: {
        'bearing-1': {
          calendarId: 'work',
          eventId: 'native-1',
          updatedAt: startAt.toISOString(),
        },
      },
    });
    const service = createCalendarPublicationService(dependencies);

    await service.retryPublication(
      'user-1',
      bearingEvent({
        publication: {
          status: 'failed',
          markerId: '0123456789abcdef0123456789abcdef',
          commonHash: null,
          lastError: 'Retry publication.',
          retryable: true,
          deletionIntent: false,
        },
      }),
    );

    expect(adapter.updateEvent).toHaveBeenCalledWith('native-1', expect.any(Object));
    expect(adapter.createEvent).not.toHaveBeenCalled();
  });

  it('rediscovers a marker after interrupted local link persistence', async () => {
    const adapter = makeAdapter();
    (adapter.listEvents as jest.MockedFunction<typeof adapter.listEvents>).mockResolvedValue([
      nativeEvent(
        'Bring notes.\n\n[[bearing:v1:0123456789abcdef0123456789abcdef:h1-0123456789abcdef]]',
      ),
    ]);
    const dependencies = makeDependencies(adapter);
    const service = createCalendarPublicationService(dependencies);

    await service.retryPublication(
      'user-1',
      bearingEvent({
        publication: {
          status: 'failed',
          markerId: '0123456789abcdef0123456789abcdef',
          commonHash: null,
          lastError: 'Retry publication.',
          retryable: true,
          deletionIntent: false,
        },
      }),
    );

    expect(adapter.updateEvent).toHaveBeenCalledWith('native-1', expect.any(Object));
    expect(adapter.createEvent).not.toHaveBeenCalled();
    expect(dependencies.saveLink).toHaveBeenCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ eventId: 'native-1' }),
    );
  });

  it('keeps Firestore data when linked deletion cannot reach the native copy', async () => {
    const adapter = makeAdapter();
    (adapter.lookupEvent as jest.MockedFunction<typeof adapter.lookupEvent>).mockResolvedValue({
      status: 'unavailable',
      error: new Error('Permission revoked'),
    });
    const dependencies = makeDependencies(adapter);
    (
      dependencies.loadSettings as jest.MockedFunction<typeof dependencies.loadSettings>
    ).mockResolvedValue({
      selectedCalendarIds: ['work'],
      defaultCalendarId: 'work',
      linkCache: {
        'bearing-1': {
          calendarId: 'work',
          eventId: 'native-1',
          updatedAt: startAt.toISOString(),
        },
      },
    });
    const service = createCalendarPublicationService(dependencies);
    const event = bearingEvent({
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash: 'h1-0123456789abcdef',
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });

    await expect(service.deleteEvent('user-1', event)).rejects.toThrow('linked device copy');
    expect(dependencies.deleteBearingEvent).not.toHaveBeenCalled();
    expect(dependencies.updatePublication).toHaveBeenLastCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ deletionIntent: true, retryable: true }),
    );
  });

  it('deletes a failed Bearing event after confirming no native copy was created', async () => {
    const dependencies = makeDependencies();
    const service = createCalendarPublicationService(dependencies);
    const event = bearingEvent({
      publication: {
        status: 'failed',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash: null,
        lastError: 'Device publication failed.',
        retryable: true,
        deletionIntent: false,
      },
    });

    await service.deleteEvent('user-1', event);

    expect(dependencies.adapter.listEvents).toHaveBeenCalled();
    expect(dependencies.deleteBearingEvent).toHaveBeenCalledWith('user-1', 'bearing-1');
    expect(dependencies.updatePublication).not.toHaveBeenCalled();
  });

  it('propagates one-sided Bearing edits to the linked native copy', async () => {
    const dependencies = makeDependencies();
    const service = createCalendarPublicationService(dependencies);
    const base = bearingEvent();
    const commonHash = canonicalCalendarFieldHash(base);
    const event = bearingEvent({
      title: 'Bearing changed',
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash,
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });
    const device = nativeEvent(
      `Bring notes.\n\n[[bearing:v1:0123456789abcdef0123456789abcdef:${commonHash}]]`,
    );

    await service.reconcileEvent('user-1', event, device);

    expect(dependencies.adapter.updateEvent).toHaveBeenCalledWith(
      'native-1',
      expect.objectContaining({ title: 'Bearing changed' }),
    );
    expect(dependencies.updateBearingEvent).not.toHaveBeenCalled();
  });

  it('preserves the Android custom recurrence error when editing a linked event', async () => {
    const adapter = makeAdapter();
    (adapter.updateEvent as jest.MockedFunction<typeof adapter.updateEvent>).mockRejectedValue(
      new Error(CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE),
    );
    const dependencies = makeDependencies(adapter);
    (dependencies.loadSettings as jest.MockedFunction<typeof dependencies.loadSettings>).mockResolvedValue({
      selectedCalendarIds: ['work'],
      defaultCalendarId: 'work',
      linkCache: {
        'bearing-1': {
          calendarId: 'work',
          eventId: 'native-1',
          updatedAt: startAt.toISOString(),
        },
      },
    });
    const service = createCalendarPublicationService(dependencies);
    const event = bearingEvent({
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash: 'h1-0123456789abcdef',
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });
    const recurrenceRule = {
      frequency: 'weekly' as const,
      interval: 1,
      endAt: null,
      occurrenceCount: null,
      weekdays: ['monday', 'wednesday', 'saturday'] as const,
    };

    await expect(
      service.updateEvent('user-1', event, {
        recurrenceRule: { ...recurrenceRule, weekdays: [...recurrenceRule.weekdays] },
      }),
    ).resolves.toBe('failed');
    expect(dependencies.updatePublication).toHaveBeenLastCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ lastError: CUSTOM_WEEKDAY_RECURRENCE_UNSUPPORTED_MESSAGE }),
    );
  });

  it('applies the device version when both linked copies changed', async () => {
    const dependencies = makeDependencies();
    const service = createCalendarPublicationService(dependencies);
    const base = bearingEvent();
    const commonHash = canonicalCalendarFieldHash(base);
    const event = bearingEvent({
      title: 'Bearing changed',
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash,
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });
    const device = {
      ...nativeEvent(
        `Bring notes.\n\n[[bearing:v1:0123456789abcdef0123456789abcdef:${commonHash}]]`,
      ),
      title: 'Device changed',
    };

    await service.reconcileEvent('user-1', event, device);

    expect(dependencies.updateBearingEvent).toHaveBeenCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ title: 'Device changed', description: 'Bring notes.' }),
    );
  });

  it('rediscovers a synchronized copy by opaque marker without title/time heuristics', () => {
    const event = bearingEvent({
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash: 'h1-0123456789abcdef',
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });
    const marked = nativeEvent(
      'Private notes\n\n[[bearing:v1:0123456789abcdef0123456789abcdef:h1-0123456789abcdef]]',
    );

    expect(findRediscoveredLinks([event], [marked])).toEqual({
      'bearing-1': { calendarId: 'work', eventId: 'native-1', updatedAt: '' },
    });
  });

  it('confirms a missing linked copy before keeping the Bearing event unpublished', async () => {
    const dependencies = makeDependencies();
    (
      dependencies.loadSettings as jest.MockedFunction<typeof dependencies.loadSettings>
    ).mockResolvedValue({
      selectedCalendarIds: ['work'],
      defaultCalendarId: 'work',
      linkCache: {
        'bearing-1': {
          calendarId: 'work',
          eventId: 'native-1',
          updatedAt: startAt.toISOString(),
        },
      },
    });
    const service = createCalendarPublicationService(dependencies);
    const event = bearingEvent({
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash: 'h1-0123456789abcdef',
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });

    await expect(service.synchronizeVisibleEvents('user-1', [event], [])).resolves.toEqual({});
    expect(dependencies.adapter.lookupEvent).toHaveBeenCalledWith('native-1');
    expect(dependencies.deleteBearingEvent).not.toHaveBeenCalled();
    expect(dependencies.updatePublication).toHaveBeenCalledWith(
      'user-1',
      'bearing-1',
      expect.objectContaining({ status: 'unpublished', retryable: false }),
    );
  });

  it('does not infer external deletion when native lookup is unavailable', async () => {
    const adapter = makeAdapter();
    (adapter.lookupEvent as jest.MockedFunction<typeof adapter.lookupEvent>).mockResolvedValue({
      status: 'unavailable',
      error: new Error('Calendar service unavailable'),
    });
    const dependencies = makeDependencies(adapter);
    const link = {
      calendarId: 'work',
      eventId: 'native-1',
      updatedAt: startAt.toISOString(),
    };
    (
      dependencies.loadSettings as jest.MockedFunction<typeof dependencies.loadSettings>
    ).mockResolvedValue({
      selectedCalendarIds: ['work'],
      defaultCalendarId: 'work',
      linkCache: { 'bearing-1': link },
    });
    const service = createCalendarPublicationService(dependencies);
    const event = bearingEvent({
      publication: {
        status: 'published',
        markerId: '0123456789abcdef0123456789abcdef',
        commonHash: 'h1-0123456789abcdef',
        lastError: null,
        retryable: false,
        deletionIntent: false,
      },
    });

    await expect(service.synchronizeVisibleEvents('user-1', [event], [])).resolves.toEqual({
      'bearing-1': link,
    });
    expect(dependencies.removeLink).not.toHaveBeenCalled();
    expect(dependencies.updatePublication).not.toHaveBeenCalled();
  });
});
