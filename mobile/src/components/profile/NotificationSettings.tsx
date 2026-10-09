import { useEffect, useState } from 'react';
import { Linking, Switch, Text } from 'react-native';

import { usePushNotifications } from '../../features/notifications/PushNotificationProvider';
import {
  NotificationPreferences,
  validateNotificationPreferences,
} from '../../features/notifications/notificationPreferences';
import { AppButton } from '../ui/AppButton';
import { FormField } from '../ui/FormField';
import { ListItem } from '../ui/ListItem';
import { useTheme } from '../../design/ThemeProvider';

export function NotificationSettings({
  preferences,
  onSave,
}: {
  preferences: NotificationPreferences;
  onSave: (value: NotificationPreferences) => Promise<void>;
}) {
  const push = usePushNotifications();
  const { theme } = useTheme();
  const [dueEnabled, setDueEnabled] = useState(preferences.dueDateEnabled);
  const [days, setDays] = useState(String(preferences.daysBeforeDueDate));
  const [time, setTime] = useState(preferences.morningTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDueEnabled(preferences.dueDateEnabled);
    setDays(String(preferences.daysBeforeDueDate));
    setTime(preferences.morningTime);
  }, [preferences]);

  async function togglePush(value: boolean): Promise<void> {
    setError(null);
    try {
      await (value ? push.enable() : push.disable());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change notification settings.');
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      if (!/^\d+$/.test(days)) throw new Error('Days before must be a whole number from 0 to 28.');
      const value = {
        dueDateEnabled: dueEnabled,
        daysBeforeDueDate: Number(days),
        morningTime: time.trim(),
      };
      validateNotificationPreferences(value);
      if (value.dueDateEnabled && !push.enabled) await push.enable();
      await onSave(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save notification preferences.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ListItem
        variant="row"
        title="Push notifications on this device"
        description={`Permission: ${push.permission}. Reminders respect silent mode and Do Not Disturb.`}
        trailingContent={
          <Switch
            accessibilityLabel="Enable push notifications"
            value={push.enabled}
            disabled={push.pending || saving}
            onValueChange={(value) => {
              void togglePush(value);
            }}
          />
        }
      />
      {push.permission === 'denied' ? (
        <AppButton
          label="Open device notification settings"
          onPress={() => {
            void Linking.openSettings().catch(() => setError('Unable to open device settings.'));
          }}
        />
      ) : null}
      {push.permission === 'unavailable' ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          Push notifications require a physical Android or iOS device and a native build.
        </Text>
      ) : null}
      <ListItem
        variant="row"
        title="Goal task due-date reminders"
        description="One morning summary of unfinished tasks linked to active goals."
        trailingContent={
          <Switch
            accessibilityLabel="Enable goal task due-date reminders"
            value={dueEnabled}
            disabled={saving}
            onValueChange={setDueEnabled}
          />
        }
      />
      <FormField
        label="Days before the due date"
        accessibilityLabel="Due date reminder days"
        keyboardType="number-pad"
        value={days}
        onChangeText={setDays}
        helperText="0 means the due date itself. Choose 0-28 days; default is 1."
      />
      <FormField
        label="Morning reminder time"
        accessibilityLabel="Morning reminder time"
        value={time}
        onChangeText={setTime}
        placeholder="06:00"
        helperText="24-hour HH:mm, in this device's timezone. Also used for all-day event reminders."
      />
      <AppButton
        label="Save notification preferences"
        onPress={() => {
          void save();
        }}
        loading={saving}
        loadingLabel="Saving..."
      />
      {error || push.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.dangerText }}>
          {error ?? push.error}
        </Text>
      ) : null}
    </>
  );
}
