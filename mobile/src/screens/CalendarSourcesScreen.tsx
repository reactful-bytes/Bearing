import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { ListItem } from '../components/ui/ListItem';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { getFirebaseAuth } from '../services/firebase/firebaseAuth';
import { useDeviceCalendars } from '../features/calendar/useDeviceCalendars';

type CalendarSourcesScreenProps = {
  navigation?: {
    goBack?: () => void;
  };
};

export function CalendarSourcesScreen({ navigation }: CalendarSourcesScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const userId = getFirebaseAuth().currentUser?.uid ?? null;
  const deviceCalendars = useDeviceCalendars(userId);

  async function runAction(action: () => Promise<void>): Promise<void> {
    setPending(true);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Calendar action failed.');
    } finally {
      setPending(false);
    }
  }

  const isPermissionRequired =
    deviceCalendars.permission !== 'granted' && deviceCalendars.permission !== 'unavailable';

  return (
    <AppScreen mode="scroll" testID="calendar-sources-screen">
      <View style={styles.header}>
        <AppButton
          label="Back"
          variant="secondary"
          accessibilityLabel="Back to Calendar"
          onPress={() => navigation?.goBack?.()}
        />
        <Text style={styles.title}>Calendar Sources</Text>
        <Text style={styles.description}>
          Choose which device calendars appear in Bearing and where new events are published.
        </Text>
      </View>

      {isPermissionRequired ? (
        <AppButton
          label={
            deviceCalendars.permission === 'blocked' ? 'Open Settings' : 'Allow Calendar Access'
          }
          variant="primary"
          accessibilityLabel={
            deviceCalendars.permission === 'blocked'
              ? 'Open device settings'
              : 'Allow device calendar access'
          }
          onPress={() =>
            void runAction(
              deviceCalendars.permission === 'blocked'
                ? deviceCalendars.openSettings
                : deviceCalendars.requestPermission,
            )
          }
          loading={pending}
          loadingLabel="Working..."
        />
      ) : null}

      {deviceCalendars.permission === 'granted' ? (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Visible calendars</Text>
              <AppButton
                label="Refresh"
                variant="secondary"
                accessibilityLabel="Refresh device calendars"
                onPress={() => void runAction(deviceCalendars.refresh)}
                loading={pending}
                loadingLabel="Refreshing..."
              />
            </View>
            {deviceCalendars.calendars.length > 0 ? (
              deviceCalendars.calendars.map((calendar) => {
                const isVisible = deviceCalendars.selectedCalendarIds.includes(calendar.id);
                return (
                  <ListItem
                    key={calendar.id}
                    title={calendar.title}
                    description={`${calendar.sourceLabel}${calendar.isPrimary ? ' • Primary' : ''}${!calendar.allowsModifications ? ' • Read only' : ''}`}
                    trailingText={isVisible ? 'Visible' : 'Hidden'}
                    onPress={() =>
                      void runAction(() => deviceCalendars.toggleCalendar(calendar.id))
                    }
                    disabled={pending}
                  />
                );
              })
            ) : (
              <Text style={styles.muted}>No system calendars were found.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Writable default</Text>
            <ListItem
              title="Bearing only"
              description="Keep new events inside Bearing."
              trailingText={deviceCalendars.defaultCalendarId === null ? 'Default' : 'Choose'}
              onPress={() => void runAction(() => deviceCalendars.setDefaultCalendar(null))}
              disabled={pending}
            />
            {deviceCalendars.calendars
              .filter((calendar) => calendar.allowsModifications)
              .map((calendar) => (
                <ListItem
                  key={calendar.id}
                  title={calendar.title}
                  description={calendar.sourceLabel}
                  trailingText={
                    deviceCalendars.defaultCalendarId === calendar.id ? 'Default' : 'Choose'
                  }
                  onPress={() =>
                    void runAction(() => deviceCalendars.setDefaultCalendar(calendar.id))
                  }
                  disabled={pending}
                />
              ))}
          </View>
        </>
      ) : null}

      {deviceCalendars.uiState === 'loading' ? (
        <Text style={styles.muted}>Loading calendar sources...</Text>
      ) : null}
      {deviceCalendars.uiState === 'unavailable' ? (
        <Text style={styles.muted}>Device calendar access is unavailable on this platform.</Text>
      ) : null}
      {deviceCalendars.staleSelectionRecovered ? (
        <Text style={styles.error}>
          A saved calendar was removed or became read only. Bearing-only creation is still
          available.
        </Text>
      ) : null}
      {deviceCalendars.error ? (
        <Text style={styles.error}>{deviceCalendars.error.message}</Text>
      ) : null}
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.screenTitle,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.sectionTitle,
      color: theme.colors.text,
    },
    muted: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    error: {
      ...theme.typography.helper,
      color: theme.colors.dangerText,
      marginTop: theme.spacing.sm,
    },
  });
