import {
  canonicalCalendarFieldHash,
  createOpaqueLinkId,
  decideCalendarReconciliation,
  parsePublicationMarker,
  replacePublicationMarker,
} from './calendarReconciliation';
import {
  BearingEvent,
  CalendarPublicationMetadata,
  CreateEventInput,
  CreateEventOptions,
  UpdateEventInput,
  createUnpublishedMetadata,
} from './calendarTypes';
import { DeviceCalendarEventRecord, DeviceCalendarLink } from './deviceCalendarTypes';
import {
  DeviceCalendarAdapter,
  deviceCalendarAdapter,
} from '../../services/calendar/deviceCalendarAdapter';
import {
  loadDeviceCalendarSettings,
  removeDeviceCalendarLink,
  saveDeviceCalendarLink,
} from '../../services/calendar/deviceCalendarSettings';
import {
  createEvent as createFirebaseEvent,
  deleteEvent as deleteFirebaseEvent,
  updateEvent as updateFirebaseEvent,
  updateEventPublication,
} from '../../services/firebase/firebaseEvents';

export type CalendarPublicationResult = {
  eventId: string;
  status: 'unpublished' | 'published' | 'failed';
};

export type CalendarPublicationDependencies = {
  adapter: DeviceCalendarAdapter;
  createBearingEvent: typeof createFirebaseEvent;
  updateBearingEvent: typeof updateFirebaseEvent;
  updatePublication: typeof updateEventPublication;
  deleteBearingEvent: typeof deleteFirebaseEvent;
  loadSettings: typeof loadDeviceCalendarSettings;
  saveLink: typeof saveDeviceCalendarLink;
  removeLink: typeof removeDeviceCalendarLink;
  random: () => number;
  now: () => Date;
};

const PUBLICATION_ERROR = 'Device publication failed. Retry from event details.';
const DELETION_ERROR = 'The linked device copy could not be deleted. Retry from event details.';

const defaultDependencies: CalendarPublicationDependencies = {
  adapter: deviceCalendarAdapter,
  createBearingEvent: createFirebaseEvent,
  updateBearingEvent: updateFirebaseEvent,
  updatePublication: updateEventPublication,
  deleteBearingEvent: deleteFirebaseEvent,
  loadSettings: loadDeviceCalendarSettings,
  saveLink: saveDeviceCalendarLink,
  removeLink: removeDeviceCalendarLink,
  random: Math.random,
  now: () => new Date(),
};

function eventFields(input: CreateEventInput | BearingEvent) {
  return {
    title: input.title,
    description: input.description,
    startAt: input.startAt,
    endAt: input.endAt,
    timezone: input.timezone,
    allDay: input.allDay ?? false,
    location: input.location ?? '',
    recurrenceRule: input.recurrenceRule ?? null,
    alarms: input.alarms ?? [],
    availability: input.availability ?? 'busy',
    url: input.url ?? null,
  };
}

function deviceFields(record: DeviceCalendarEventRecord) {
  return {
    title: record.title,
    description: parsePublicationMarker(record.notes).userNotes,
    startAt: record.startDate,
    endAt: record.endDate,
    timezone: record.timeZone,
    allDay: record.allDay,
    location: record.location,
    recurrenceRule: record.recurrenceRule,
    alarms: record.alarms,
    availability: record.availability,
    url: record.url,
  };
}

function markedInput(input: CreateEventInput | BearingEvent, markerId: string, hash: string) {
  return {
    ...eventFields(input),
    description: replacePublicationMarker(input.description, {
      version: 1,
      linkId: markerId,
      commonHash: hash,
    }),
  };
}

async function createOrRediscoverNativeEvent(
  input: CreateEventInput | BearingEvent,
  markerId: string,
  hash: string,
  calendarIds: string[],
  defaultCalendarId: string,
  dependencies: CalendarPublicationDependencies,
): Promise<DeviceCalendarEventRecord> {
  const rangePadding = 24 * 60 * 60 * 1_000;
  const candidates = await dependencies.adapter.listEvents(
    [...new Set([...calendarIds, defaultCalendarId])],
    new Date(input.startAt.getTime() - rangePadding),
    new Date(input.endAt.getTime() + rangePadding),
  );
  const rediscovered = candidates.find(
    (candidate) => parsePublicationMarker(candidate.notes).marker?.linkId === markerId,
  );

  if (rediscovered) {
    await dependencies.adapter.updateEvent(rediscovered.id, markedInput(input, markerId, hash));
    return rediscovered;
  }

  return dependencies.adapter.createEvent(defaultCalendarId, markedInput(input, markerId, hash));
}

async function markFailure(
  userId: string,
  eventId: string,
  deletionIntent: boolean,
  dependencies: CalendarPublicationDependencies,
): Promise<void> {
  await dependencies.updatePublication(userId, eventId, {
    status: 'failed',
    lastError: deletionIntent ? DELETION_ERROR : PUBLICATION_ERROR,
    retryable: true,
    deletionIntent,
  });
}

async function publishExisting(
  userId: string,
  eventId: string,
  input: CreateEventInput | BearingEvent,
  markerId: string,
  dependencies: CalendarPublicationDependencies,
): Promise<CalendarPublicationResult> {
  try {
    const settings = await dependencies.loadSettings(userId);
    if (!settings?.defaultCalendarId) throw new Error('No writable default calendar is selected.');

    const hash = canonicalCalendarFieldHash(eventFields(input));
    const existingLink = settings.linkCache[eventId];
    let nativeEvent: DeviceCalendarEventRecord;

    if (existingLink) {
      const lookup = await dependencies.adapter.lookupEvent(existingLink.eventId);
      if (lookup.status === 'found') {
        await dependencies.adapter.updateEvent(
          existingLink.eventId,
          markedInput(input, markerId, hash),
        );
        nativeEvent = { ...lookup.event, ...markedInput(input, markerId, hash) };
      } else {
        if (lookup.status === 'unavailable') throw lookup.error;
        await dependencies.removeLink(userId, eventId);
        nativeEvent = await createOrRediscoverNativeEvent(
          input,
          markerId,
          hash,
          settings.selectedCalendarIds,
          settings.defaultCalendarId,
          dependencies,
        );
      }
    } else {
      nativeEvent = await createOrRediscoverNativeEvent(
        input,
        markerId,
        hash,
        settings.selectedCalendarIds,
        settings.defaultCalendarId,
        dependencies,
      );
    }

    await dependencies.saveLink(userId, eventId, {
      calendarId: nativeEvent.calendarId,
      eventId: nativeEvent.id,
      updatedAt: dependencies.now().toISOString(),
    });
    await dependencies.updatePublication(userId, eventId, {
      status: 'published',
      markerId,
      commonHash: hash,
      lastError: null,
      retryable: false,
      deletionIntent: false,
    });
    return { eventId, status: 'published' };
  } catch {
    await markFailure(userId, eventId, false, dependencies);
    return { eventId, status: 'failed' };
  }
}

export function createCalendarPublicationService(
  dependencyOverrides: Partial<CalendarPublicationDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  return {
    async createEvent(
      userId: string,
      input: CreateEventInput,
      options: CreateEventOptions = { publishToDevice: false },
    ): Promise<CalendarPublicationResult> {
      if (!options.publishToDevice) {
        const eventId = await dependencies.createBearingEvent(
          userId,
          input,
          createUnpublishedMetadata(),
        );
        return { eventId, status: 'unpublished' };
      }

      const markerId = createOpaqueLinkId(dependencies.random);
      const hash = canonicalCalendarFieldHash(eventFields(input));
      const publication: CalendarPublicationMetadata = {
        status: 'publishing',
        markerId,
        commonHash: hash,
        lastError: null,
        retryable: true,
        deletionIntent: false,
      };
      const eventId = await dependencies.createBearingEvent(userId, input, publication);
      return publishExisting(userId, eventId, input, markerId, dependencies);
    },

    async retryPublication(
      userId: string,
      event: BearingEvent,
    ): Promise<CalendarPublicationResult> {
      const markerId = event.publication.markerId ?? createOpaqueLinkId(dependencies.random);
      await dependencies.updatePublication(userId, event.id, {
        status: 'publishing',
        markerId,
        lastError: null,
        retryable: true,
        deletionIntent: false,
      });
      return publishExisting(userId, event.id, event, markerId, dependencies);
    },

    async publishEvent(
      userId: string,
      eventId: string,
      input: CreateEventInput,
    ): Promise<CalendarPublicationResult> {
      const markerId = createOpaqueLinkId(dependencies.random);
      await dependencies.updatePublication(userId, eventId, {
        status: 'publishing',
        markerId,
        commonHash: canonicalCalendarFieldHash(eventFields(input)),
        lastError: null,
        retryable: true,
        deletionIntent: false,
      });
      return publishExisting(userId, eventId, input, markerId, dependencies);
    },

    async reconcileEvent(
      userId: string,
      event: BearingEvent,
      deviceEvent: DeviceCalendarEventRecord,
    ): Promise<void> {
      const marker = parsePublicationMarker(deviceEvent.notes).marker;
      if (!event.publication.markerId || marker?.linkId !== event.publication.markerId) return;

      const bearingHash = canonicalCalendarFieldHash(eventFields(event));
      const nativeFields = deviceFields(deviceEvent);
      const deviceHash = canonicalCalendarFieldHash(nativeFields);
      const decision = decideCalendarReconciliation(
        bearingHash,
        deviceHash,
        event.publication.commonHash,
      );

      if (
        decision.action === 'none' &&
        marker.commonHash === decision.winningHash &&
        event.publication.status === 'published' &&
        !event.publication.lastError
      ) {
        return;
      }

      try {
        if (decision.action === 'update-device') {
          await dependencies.adapter.updateEvent(
            deviceEvent.id,
            markedInput(event, marker.linkId, decision.winningHash),
          );
        } else if (decision.action === 'update-bearing') {
          await dependencies.updateBearingEvent(userId, event.id, nativeFields);
          await dependencies.adapter.updateEvent(deviceEvent.id, {
            description: replacePublicationMarker(deviceEvent.notes, {
              version: 1,
              linkId: marker.linkId,
              commonHash: decision.winningHash,
            }),
          });
        } else if (marker.commonHash !== decision.winningHash) {
          await dependencies.adapter.updateEvent(deviceEvent.id, {
            description: replacePublicationMarker(deviceEvent.notes, {
              version: 1,
              linkId: marker.linkId,
              commonHash: decision.winningHash,
            }),
          });
        }

        await dependencies.updatePublication(userId, event.id, {
          status: 'published',
          commonHash: decision.winningHash,
          lastError: null,
          retryable: false,
          deletionIntent: false,
        });
      } catch {
        await markFailure(userId, event.id, false, dependencies);
      }
    },

    async synchronizeVisibleEvents(
      userId: string,
      bearingEvents: BearingEvent[],
      deviceEvents: DeviceCalendarEventRecord[],
    ): Promise<Record<string, DeviceCalendarLink>> {
      const settings = await dependencies.loadSettings(userId);
      const links = { ...(settings?.linkCache ?? {}) };
      const recordsById = new Map(deviceEvents.map((event) => [event.id, event]));
      const rediscovered = findRediscoveredLinks(bearingEvents, deviceEvents);

      for (const [eventId, link] of Object.entries(rediscovered)) {
        const existing = links[eventId];
        if (existing?.eventId === link.eventId && existing.calendarId === link.calendarId) continue;
        const nextLink = { ...link, updatedAt: dependencies.now().toISOString() };
        await dependencies.saveLink(userId, eventId, nextLink);
        links[eventId] = nextLink;
      }

      for (const event of bearingEvents) {
        if (!event.publication.markerId) continue;
        const link = links[event.id];
        let deviceEvent = deviceEvents.find(
          (candidate) =>
            parsePublicationMarker(candidate.notes).marker?.linkId === event.publication.markerId,
        );

        if (!deviceEvent && link) {
          deviceEvent = recordsById.get(link.eventId);
          if (!deviceEvent) {
            const lookup = await dependencies.adapter.lookupEvent(link.eventId);
            if (lookup.status === 'unavailable') continue;
            if (lookup.status === 'found') {
              deviceEvent = lookup.event;
              if (link.eventId !== lookup.event.id || link.calendarId !== lookup.event.calendarId) {
                const movedLink = {
                  calendarId: lookup.event.calendarId,
                  eventId: lookup.event.id,
                  updatedAt: dependencies.now().toISOString(),
                };
                await dependencies.saveLink(userId, event.id, movedLink);
                links[event.id] = movedLink;
              }
            }
          }
        }

        const marker = deviceEvent ? parsePublicationMarker(deviceEvent.notes).marker : null;
        if (!deviceEvent || marker?.linkId !== event.publication.markerId) {
          if (!link) continue;
          await dependencies.removeLink(userId, event.id);
          delete links[event.id];
          await dependencies.updatePublication(userId, event.id, {
            status: 'unpublished',
            commonHash: null,
            lastError: null,
            retryable: false,
            deletionIntent: false,
          });
          continue;
        }

        await this.reconcileEvent(userId, event, deviceEvent);
      }

      return links;
    },

    async updateEvent(
      userId: string,
      event: BearingEvent,
      fields: UpdateEventInput,
    ): Promise<void> {
      await dependencies.updateBearingEvent(userId, event.id, fields);
      if (event.publication.status !== 'published' || !event.publication.markerId) return;

      const settings = await dependencies.loadSettings(userId);
      const link = settings?.linkCache[event.id];
      if (!link) {
        await markFailure(userId, event.id, false, dependencies);
        return;
      }

      const updatedEvent = { ...event, ...fields };
      try {
        const hash = canonicalCalendarFieldHash(eventFields(updatedEvent));
        await dependencies.adapter.updateEvent(
          link.eventId,
          markedInput(updatedEvent, event.publication.markerId, hash),
        );
        await dependencies.updatePublication(userId, event.id, {
          commonHash: hash,
          lastError: null,
          retryable: false,
        });
      } catch {
        await markFailure(userId, event.id, false, dependencies);
      }
    },

    async deleteEvent(userId: string, event: BearingEvent): Promise<void> {
      if (event.publication.status === 'unpublished') {
        await dependencies.deleteBearingEvent(userId, event.id);
        return;
      }

      const settings = await dependencies.loadSettings(userId);
      let link = settings?.linkCache[event.id];
      if (!link && event.publication.markerId && settings?.defaultCalendarId) {
        try {
          const rangePadding = 24 * 60 * 60 * 1_000;
          const candidates = await dependencies.adapter.listEvents(
            [...new Set([...settings.selectedCalendarIds, settings.defaultCalendarId])],
            new Date(event.startAt.getTime() - rangePadding),
            new Date(event.endAt.getTime() + rangePadding),
          );
          const rediscovered = candidates.find(
            (candidate) =>
              parsePublicationMarker(candidate.notes).marker?.linkId === event.publication.markerId,
          );
          if (!rediscovered) {
            await dependencies.deleteBearingEvent(userId, event.id);
            return;
          }

          link = {
            calendarId: rediscovered.calendarId,
            eventId: rediscovered.id,
            updatedAt: dependencies.now().toISOString(),
          };
          await dependencies.saveLink(userId, event.id, link);
        } catch {
          await markFailure(userId, event.id, true, dependencies);
          throw new Error(DELETION_ERROR);
        }
      }
      if (!link) {
        await markFailure(userId, event.id, true, dependencies);
        throw new Error(DELETION_ERROR);
      }

      await dependencies.updatePublication(userId, event.id, {
        status: 'deleting',
        deletionIntent: true,
        retryable: true,
      });
      const lookup = await dependencies.adapter.lookupEvent(link.eventId);
      if (lookup.status === 'unavailable') {
        await markFailure(userId, event.id, true, dependencies);
        throw new Error(DELETION_ERROR);
      }
      if (lookup.status === 'found') await dependencies.adapter.deleteEvent(link.eventId);

      await dependencies.removeLink(userId, event.id);
      await dependencies.deleteBearingEvent(userId, event.id);
    },
  };
}

export const calendarPublicationService = createCalendarPublicationService();

export function findRediscoveredLinks(
  bearingEvents: BearingEvent[],
  deviceEvents: DeviceCalendarEventRecord[],
): Record<string, DeviceCalendarLink> {
  const eventByMarker = new Map(
    bearingEvents.flatMap((event) =>
      event.publication.markerId ? [[event.publication.markerId, event] as const] : [],
    ),
  );

  return Object.fromEntries(
    deviceEvents.flatMap((deviceEvent) => {
      const marker = parsePublicationMarker(deviceEvent.notes).marker;
      const event = marker ? eventByMarker.get(marker.linkId) : null;
      return event
        ? [
            [
              event.id,
              { calendarId: deviceEvent.calendarId, eventId: deviceEvent.id, updatedAt: '' },
            ],
          ]
        : [];
    }),
  );
}
