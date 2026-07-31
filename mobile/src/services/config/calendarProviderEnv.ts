import { CalendarConnectionProvider } from '../../features/calendar/calendarConnectionTypes';

type ProviderConfigStatus = {
  isConfigured: boolean;
  missingKeys: string[];
};

type CalendarProviderEnvStatus = {
  google: ProviderConfigStatus;
  microsoft: ProviderConfigStatus;
};

function getRuntimeEnv(): Record<string, string | undefined> {
  const maybeProcess = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return maybeProcess.process?.env ?? {};
}

function buildProviderStatus(requiredKeys: string[]): ProviderConfigStatus {
  const env = getRuntimeEnv();
  const missingKeys = requiredKeys.filter((envKey) => {
    const value = env[envKey];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}

export function getCalendarProviderEnvStatus(): CalendarProviderEnvStatus {
  return {
    google: buildProviderStatus([
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
      'EXPO_PUBLIC_CALENDAR_SYNC_API_BASE_URL',
    ]),
    microsoft: buildProviderStatus([
      'EXPO_PUBLIC_MICROSOFT_CLIENT_ID',
      'EXPO_PUBLIC_MICROSOFT_TENANT_ID',
      'EXPO_PUBLIC_CALENDAR_SYNC_API_BASE_URL',
    ]),
  };
}

export function getProviderSetupMessage(provider: CalendarConnectionProvider): string {
  const status = getCalendarProviderEnvStatus()[provider];

  if (status.isConfigured) {
    return 'Provider client configuration is present. Complete backend deployment and the first live connection to manage calendars here.';
  }

  return `Missing environment values: ${status.missingKeys.join(', ')}.`;
}
