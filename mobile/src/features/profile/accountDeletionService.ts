import {
  loadDeviceCalendarSettings,
  purgeDeviceCalendarSettings,
  saveDeviceCalendarSettings,
} from '../../services/calendar/deviceCalendarSettings';
import {
  DeviceCalendarAdapter,
  deviceCalendarAdapter,
} from '../../services/calendar/deviceCalendarAdapter';
import { purgeTelemetryConsent } from '../../services/telemetry/telemetry';

export type LinkedCalendarCleanupResult = {
  removedCount: number;
  failedCount: number;
};

export async function purgeLocalAccountData(userId: string): Promise<{ failedCount: number }> {
  const results = await Promise.allSettled([
    purgeDeviceCalendarSettings(userId),
    purgeTelemetryConsent(userId),
  ]);
  return { failedCount: results.filter((result) => result.status === 'rejected').length };
}

export async function cleanupLinkedCalendarCopies(
  userId: string,
  adapter: DeviceCalendarAdapter = deviceCalendarAdapter,
): Promise<LinkedCalendarCleanupResult> {
  const settings = await loadDeviceCalendarSettings(userId);
  if (!settings) return { removedCount: 0, failedCount: 0 };

  const failedLinks = { ...settings.linkCache };
  let removedCount = 0;

  for (const [bearingEventId, link] of Object.entries(settings.linkCache)) {
    try {
      const lookup = await adapter.lookupEvent(link.eventId);
      if (lookup.status === 'unavailable') continue;
      if (lookup.status === 'found') await adapter.deleteEvent(link.eventId);
      delete failedLinks[bearingEventId];
      removedCount += 1;
    } catch {
      // Keep the link cached so cleanup can be retried before account deletion.
    }
  }

  const failedCount = Object.keys(failedLinks).length;
  if (failedCount === 0) {
    await purgeDeviceCalendarSettings(userId);
  } else {
    await saveDeviceCalendarSettings(userId, { ...settings, linkCache: failedLinks });
  }

  return { removedCount, failedCount };
}
