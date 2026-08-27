import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_STORAGE_PREFIX = '@bearing/telemetry-consent/v1/';

export type TelemetryEventProperties = {
  ai_goal_plan_result: {
    outcome: 'success' | 'failure';
  };
  auth_result: {
    operation: 'account_link' | 'password_reset';
    outcome: 'success' | 'failure';
  };
  calendar_export_result: {
    action: 'download' | 'save' | 'share';
    format: 'ics' | 'json';
    outcome: 'success' | 'failure';
  };
  calendar_permission_result: {
    outcome: 'undetermined' | 'granted' | 'denied' | 'blocked' | 'unavailable' | 'failure';
  };
  calendar_publication_result: {
    operation: 'create' | 'update' | 'delete' | 'retry';
    outcome: 'success' | 'failure';
  };
  premium_paywall_viewed: {
    feature: 'ai_goal_builder' | 'premium_overview';
  };
  premium_purchase_started: {
    period: string;
  };
  premium_purchase_result: {
    period: string;
    outcome: 'success' | 'cancelled' | 'failure';
  };
  premium_restore_result: {
    outcome: 'success' | 'failure';
  };
  premium_activation_result: {
    source: 'purchase' | 'restore';
    outcome: 'success' | 'delayed';
  };
  premium_credit_pack_viewed: {
    source: 'ai_planning' | 'profile';
  };
  premium_credit_pack_purchase_started: {
    source: 'ai_planning' | 'profile';
  };
  premium_credit_pack_purchase_result: {
    source: 'ai_planning' | 'profile';
    outcome: 'success' | 'cancelled' | 'failure' | 'sync_failure';
  };
  premium_credit_pack_balance_refresh_result: {
    source: 'ai_planning' | 'profile';
    outcome: 'success' | 'failure';
  };
};

export type TelemetryEventName = keyof TelemetryEventProperties;

export type TelemetryPayload = {
  schemaVersion: 1;
  name: TelemetryEventName;
  properties: TelemetryEventProperties[TelemetryEventName];
};

export type TelemetryStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
export type TelemetryTransport = (payload: TelemetryPayload) => Promise<void>;
export type TelemetryRecordResult = 'disabled' | 'invalid' | 'sent' | 'failed';

type RecordTelemetryOptions = {
  storage?: TelemetryStorage;
  transport?: TelemetryTransport;
  userId?: string | null;
};

function getConsentStorageKey(userId: string): string {
  if (!userId.trim()) throw new Error('An authenticated user is required for telemetry consent.');
  return `${CONSENT_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return (
    actualKeys.length === keys.length &&
    keys.sort().every((key, index) => actualKeys[index] === key)
  );
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function isPremiumPurchasePeriod(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === 'monthly' ||
      value === 'annual' ||
      /^P[1-9]\d*[DWMY]$/.test(value) ||
      /^[A-Z_]{1,32}$/.test(value))
  );
}

export function buildTelemetryPayload(name: unknown, properties: unknown): TelemetryPayload | null {
  if (!isRecord(properties)) return null;

  switch (name) {
    case 'ai_goal_plan_result':
      if (!hasExactKeys(properties, ['outcome'])) return null;
      if (!isOneOf(properties.outcome, ['success', 'failure'])) return null;
      break;
    case 'auth_result':
      if (!hasExactKeys(properties, ['operation', 'outcome'])) return null;
      if (
        !isOneOf(properties.operation, ['account_link', 'password_reset']) ||
        !isOneOf(properties.outcome, ['success', 'failure'])
      ) {
        return null;
      }
      break;
    case 'calendar_export_result':
      if (!hasExactKeys(properties, ['action', 'format', 'outcome'])) return null;
      if (
        !isOneOf(properties.action, ['download', 'save', 'share']) ||
        !isOneOf(properties.format, ['ics', 'json']) ||
        !isOneOf(properties.outcome, ['success', 'failure'])
      ) {
        return null;
      }
      break;
    case 'calendar_permission_result':
      if (!hasExactKeys(properties, ['outcome'])) return null;
      if (
        !isOneOf(properties.outcome, [
          'undetermined',
          'granted',
          'denied',
          'blocked',
          'unavailable',
          'failure',
        ])
      ) {
        return null;
      }
      break;
    case 'calendar_publication_result':
      if (!hasExactKeys(properties, ['operation', 'outcome'])) return null;
      if (
        !isOneOf(properties.operation, ['create', 'update', 'delete', 'retry']) ||
        !isOneOf(properties.outcome, ['success', 'failure'])
      ) {
        return null;
      }
      break;
    case 'premium_paywall_viewed':
      if (!hasExactKeys(properties, ['feature'])) return null;
      if (!isOneOf(properties.feature, ['ai_goal_builder', 'premium_overview'])) return null;
      break;
    case 'premium_purchase_started':
      if (!hasExactKeys(properties, ['period'])) return null;
      if (!isPremiumPurchasePeriod(properties.period)) return null;
      break;
    case 'premium_purchase_result':
      if (!hasExactKeys(properties, ['outcome', 'period'])) return null;
      if (
        !isPremiumPurchasePeriod(properties.period) ||
        !isOneOf(properties.outcome, ['success', 'cancelled', 'failure'])
      )
        return null;
      break;
    case 'premium_restore_result':
      if (!hasExactKeys(properties, ['outcome'])) return null;
      if (!isOneOf(properties.outcome, ['success', 'failure'])) return null;
      break;
    case 'premium_activation_result':
      if (!hasExactKeys(properties, ['outcome', 'source'])) return null;
      if (
        !isOneOf(properties.source, ['purchase', 'restore']) ||
        !isOneOf(properties.outcome, ['success', 'delayed'])
      )
        return null;
      break;
    case 'premium_credit_pack_viewed':
    case 'premium_credit_pack_purchase_started':
      if (!hasExactKeys(properties, ['source'])) return null;
      if (!isOneOf(properties.source, ['ai_planning', 'profile'])) return null;
      break;
    case 'premium_credit_pack_purchase_result':
      if (!hasExactKeys(properties, ['outcome', 'source'])) return null;
      if (
        !isOneOf(properties.source, ['ai_planning', 'profile']) ||
        !isOneOf(properties.outcome, ['success', 'cancelled', 'failure', 'sync_failure'])
      )
        return null;
      break;
    case 'premium_credit_pack_balance_refresh_result':
      if (!hasExactKeys(properties, ['outcome', 'source'])) return null;
      if (
        !isOneOf(properties.source, ['ai_planning', 'profile']) ||
        !isOneOf(properties.outcome, ['success', 'failure'])
      )
        return null;
      break;
    default:
      return null;
  }

  return {
    schemaVersion: 1,
    name,
    properties: properties as TelemetryEventProperties[TelemetryEventName],
  };
}

export async function loadTelemetryConsent(
  userId: string,
  storage: TelemetryStorage = AsyncStorage,
): Promise<boolean> {
  return (await storage.getItem(getConsentStorageKey(userId))) === 'enabled';
}

export async function saveTelemetryConsent(
  userId: string,
  enabled: boolean,
  storage: TelemetryStorage = AsyncStorage,
): Promise<void> {
  await storage.setItem(getConsentStorageKey(userId), enabled ? 'enabled' : 'disabled');
}

export async function purgeTelemetryConsent(
  userId: string,
  storage: Pick<typeof AsyncStorage, 'removeItem'> = AsyncStorage,
): Promise<void> {
  await storage.removeItem(getConsentStorageKey(userId));
}

async function sendTelemetryPayload(payload: TelemetryPayload): Promise<void> {
  const [{ httpsCallable }, { getFirebaseFunctions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/firebaseFunctions'),
  ]);
  const recordEvent = httpsCallable<TelemetryPayload, { recorded: true }>(
    getFirebaseFunctions(),
    'recordTelemetryEvent',
    { timeout: 10_000 },
  );
  await recordEvent(payload);
}

export async function recordTelemetryEvent<Name extends TelemetryEventName>(
  name: Name,
  properties: TelemetryEventProperties[Name],
  options: RecordTelemetryOptions = {},
): Promise<TelemetryRecordResult> {
  try {
    const userId =
      options.userId === undefined
        ? (await import('../firebase/firebaseAuth')).getFirebaseAuth().currentUser?.uid
        : options.userId;
    if (!userId) return 'disabled';

    const storage = options.storage ?? AsyncStorage;
    if (!(await loadTelemetryConsent(userId, storage))) return 'disabled';

    const payload = buildTelemetryPayload(name, properties);
    if (!payload) return 'invalid';

    await (options.transport ?? sendTelemetryPayload)(payload);
    return 'sent';
  } catch {
    return 'failed';
  }
}
