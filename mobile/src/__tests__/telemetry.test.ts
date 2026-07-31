import { describe, expect, it, jest } from '@jest/globals';

import {
  TelemetryStorage,
  buildTelemetryPayload,
  loadTelemetryConsent,
  recordTelemetryEvent,
  saveTelemetryConsent,
} from '../services/telemetry/telemetry';

function createStorage(initialValue: string | null = null): TelemetryStorage {
  let value = initialValue;
  return {
    getItem: async () => value,
    setItem: async (_key: string, nextValue: string) => {
      value = nextValue;
    },
  };
}

describe('telemetry privacy boundary', () => {
  it('defaults consent to disabled and emits nothing', async () => {
    const storage = createStorage();
    const transport = jest.fn(async () => undefined);

    await expect(
      recordTelemetryEvent(
        'premium_paywall_viewed',
        { feature: 'premium_overview' },
        { storage, transport, userId: 'user-1' },
      ),
    ).resolves.toBe('disabled');
    expect(transport).not.toHaveBeenCalled();
  });

  it('persists explicit consent before emitting an allowed payload', async () => {
    const storage = createStorage();
    const transport = jest.fn(async () => undefined);

    await saveTelemetryConsent('user-1', true, storage);

    await expect(loadTelemetryConsent('user-1', storage)).resolves.toBe(true);
    await expect(
      recordTelemetryEvent(
        'calendar_export_result',
        { action: 'share', format: 'ics', outcome: 'success' },
        { storage, transport, userId: 'user-1' },
      ),
    ).resolves.toBe('sent');
    expect(transport).toHaveBeenCalledWith({
      schemaVersion: 1,
      name: 'calendar_export_result',
      properties: { action: 'share', format: 'ics', outcome: 'success' },
    });
  });

  it('rejects unknown events, arbitrary values, and extra sensitive properties', () => {
    expect(buildTelemetryPayload('goal_title', { title: 'private goal' })).toBeNull();
    expect(
      buildTelemetryPayload('calendar_export_result', {
        action: 'share',
        format: 'ics',
        outcome: 'success',
        email: 'private@example.com',
      }),
    ).toBeNull();
    expect(
      buildTelemetryPayload('premium_paywall_viewed', { feature: 'private-feature-name' }),
    ).toBeNull();
  });

  it('preserves the undetermined calendar permission outcome', () => {
    expect(
      buildTelemetryPayload('calendar_permission_result', { outcome: 'undetermined' }),
    ).toEqual({
      schemaVersion: 1,
      name: 'calendar_permission_result',
      properties: { outcome: 'undetermined' },
    });
  });

  it('contains transport failures without disrupting the user workflow', async () => {
    const storage = createStorage('enabled');
    const transport = jest.fn(async () => {
      throw new Error('offline');
    });

    await expect(
      recordTelemetryEvent(
        'ai_goal_plan_result',
        { outcome: 'failure' },
        {
          storage,
          transport,
          userId: 'user-1',
        },
      ),
    ).resolves.toBe('failed');
  });

  it('scopes consent to an account and contains storage failures', async () => {
    const values = new Map<string, string>();
    const storage: TelemetryStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        values.set(key, value);
      },
    };
    await saveTelemetryConsent('user-1', true, storage);

    await expect(loadTelemetryConsent('user-2', storage)).resolves.toBe(false);
    await expect(
      recordTelemetryEvent(
        'ai_goal_plan_result',
        { outcome: 'success' },
        {
          userId: 'user-1',
          storage: {
            getItem: async () => {
              throw new Error('storage failed');
            },
            setItem: storage.setItem,
          },
        },
      ),
    ).resolves.toBe('failed');
  });
});
