export type CalendarConnectionProvider = 'google' | 'microsoft';

export type CalendarConnectionStatus = 'connected' | 'disconnected' | 'error';

export type CalendarSyncStatus = 'ok' | 'warning' | 'failed' | 'never';

export type ProviderCalendarRecord = {
  id: string;
  label: string;
  color: string | null;
  isPrimary: boolean;
  isSelected: boolean;
};

export type CalendarConnectionRecord = {
  id: string;
  userId: string;
  provider: CalendarConnectionProvider;
  status: CalendarConnectionStatus;
  accountLabel: string;
  calendars: ProviderCalendarRecord[];
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: CalendarSyncStatus;
  lastErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CalendarConnectionsUiState = 'loading' | 'error' | 'empty' | 'ready';

export function getCalendarProviderLabel(provider: CalendarConnectionProvider): string {
  return provider === 'google' ? 'Google Calendar' : 'Microsoft Calendar';
}

export function formatCalendarSyncStatus(status: CalendarSyncStatus): string {
  switch (status) {
    case 'ok':
      return 'Synced';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Failed';
    case 'never':
    default:
      return 'Never synced';
  }
}