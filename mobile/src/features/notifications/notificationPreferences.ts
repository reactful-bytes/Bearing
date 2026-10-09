export type NotificationPreferences = {
  dueDateEnabled: boolean;
  daysBeforeDueDate: number;
  morningTime: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dueDateEnabled: false,
  daysBeforeDueDate: 1,
  morningTime: '06:00',
};

export function validateNotificationPreferences(value: NotificationPreferences): void {
  if (
    typeof value.dueDateEnabled !== 'boolean' ||
    !Number.isInteger(value.daysBeforeDueDate) ||
    value.daysBeforeDueDate < 0 ||
    value.daysBeforeDueDate > 28 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.morningTime)
  ) {
    throw new Error('Choose 0-28 days before the due date and a valid time in HH:mm format.');
  }
}

export function readNotificationPreferences(value: unknown): NotificationPreferences {
  if (value === undefined) return DEFAULT_NOTIFICATION_PREFERENCES;
  if (
    !value ||
    typeof value !== 'object' ||
    !('dueDateEnabled' in value) ||
    typeof value.dueDateEnabled !== 'boolean' ||
    !('daysBeforeDueDate' in value) ||
    typeof value.daysBeforeDueDate !== 'number' ||
    !('morningTime' in value) ||
    typeof value.morningTime !== 'string'
  ) {
    throw new Error('Saved notification preferences are invalid. Please update them in Profile.');
  }
  const preferences = {
    dueDateEnabled: value.dueDateEnabled,
    daysBeforeDueDate: value.daysBeforeDueDate,
    morningTime: value.morningTime,
  };
  validateNotificationPreferences(preferences);
  return preferences;
}
