import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppModal } from '../components/ui/AppModal';
import { ProfileSelectionModal } from '../components/profile/ProfileSelectionModal';
import { SoundPickerModal } from '../components/profile/SoundPickerModal';
import { TipsWisdomModal } from '../components/profile/TipsWisdomModal';
import { AppCard } from '../components/ui/AppCard';
import { ListItem } from '../components/ui/ListItem';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { colors, layout, radii, spacing, typography } from '../design/tokens';
import {
  CalendarConnectionProvider,
  CalendarConnectionRecord,
  formatCalendarSyncStatus,
  getCalendarProviderLabel,
} from '../features/calendar/calendarConnectionTypes';
import {
  buildIcsFilename,
  downloadIcsFileOnWeb,
  pickIcsFileContent,
  shareIcsExportFile,
  writeIcsExportFile,
} from '../features/calendar/icsFileInterop';
import { parseIcsCalendar, serializeEventsToIcs } from '../features/calendar/icsInterop';
import { useCalendarConnections } from '../features/calendar/useCalendarConnections';
import {
  getProfileSelectionLabel,
  PROFILE_LOCALE_OPTIONS,
  PROFILE_TIMEZONE_OPTIONS,
} from '../features/profile/profileOptions';
import { getProfileSoundOption } from '../features/profile/profileSounds';
import { getDifferentRandomProfileTip } from '../features/profile/profileTips';
import { useSoundPreview } from '../features/profile/useSoundPreview';
import { useUserProfile } from '../features/profile/useUserProfile';
import { ProfileTip } from '../features/profile/profileTypes';
import { createMirroredEvent, listUserEvents } from '../services/firebase/firebaseEvents';
import { getCalendarProviderEnvStatus, getProviderSetupMessage } from '../services/config/calendarProviderEnv';

type ProfileScreenProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

export function ProfileScreen({ onPressSignOut, isSignOutPending }: ProfileScreenProps) {
  const { authUser, profile, uiState, error, isAnonymous, email, updateProfile, sendPasswordReset, linkAnonymousAccount } =
    useUserProfile();
  const {
    connections,
    uiState: connectionsUiState,
    updateConnectionCalendars,
    updateConnectionSyncEnabled,
    disconnectConnection,
  } = useCalendarConnections();
  const { previewSound, stopPreview, previewError, playingSoundId } = useSoundPreview();
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [locale, setLocale] = useState('');
  const [accountPending, setAccountPending] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [linkDisplayName, setLinkDisplayName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkPasswordConfirm, setLinkPasswordConfirm] = useState('');
  const [linkPending, setLinkPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [soundPicker, setSoundPicker] = useState<'alarm' | 'reminder' | null>(null);
  const [selectionPicker, setSelectionPicker] = useState<'timezone' | 'locale' | null>(null);
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [activeTip, setActiveTip] = useState<ProfileTip | null>(null);
  const [soundPending, setSoundPending] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [passwordResetPending, setPasswordResetPending] = useState(false);
  const [activeConnectionProvider, setActiveConnectionProvider] = useState<CalendarConnectionProvider | null>(null);
  const [connectionPending, setConnectionPending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [icsModalVisible, setIcsModalVisible] = useState(false);
  const [icsPending, setIcsPending] = useState(false);
  const [icsError, setIcsError] = useState<string | null>(null);
  const [icsFeedback, setIcsFeedback] = useState<string | null>(null);
  const providerEnvStatus = getCalendarProviderEnvStatus();

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setTimezone(profile.timezone);
    setLocale(profile.locale);
    setLinkDisplayName((current) => current || profile.displayName);
  }, [profile]);

  async function handleSaveAccountSettings(): Promise<void> {
    if (!profile) {
      return;
    }

    if (!timezone.trim()) {
      setAccountError('Timezone is required.');
      return;
    }

    if (!locale.trim()) {
      setAccountError('Locale is required.');
      return;
    }

    setAccountPending(true);
    setAccountFeedback(null);
    setAccountError(null);

    try {
      await updateProfile({
        displayName,
        timezone,
        locale,
      });
      setAccountFeedback('Account settings saved.');
    } catch (saveError) {
      setAccountError(saveError instanceof Error ? saveError.message : 'Failed to save account settings.');
    } finally {
      setAccountPending(false);
    }
  }

  function handleOpenTipModal(): void {
    setActiveTip((currentTip) => currentTip ?? getDifferentRandomProfileTip(null));
    setTipModalVisible(true);
  }

  function handleRefreshTip(): void {
    setActiveTip((currentTip) => getDifferentRandomProfileTip(currentTip?.id ?? null));
  }

  async function handleSendPasswordReset(): Promise<void> {
    setPasswordResetPending(true);
    setAccountError(null);

    try {
      await sendPasswordReset();
      Alert.alert('Password reset sent', `Check ${email ?? 'your inbox'} for the reset link.`);
    } catch (resetError) {
      setAccountError(resetError instanceof Error ? resetError.message : 'Failed to send password reset email.');
    } finally {
      setPasswordResetPending(false);
    }
  }

  async function handleLinkAnonymousAccount(): Promise<void> {
    if (!linkDisplayName.trim()) {
      setLinkError('Display name is required to secure the account.');
      return;
    }

    if (!linkEmail.trim()) {
      setLinkError('Email is required.');
      return;
    }

    if (linkPassword.length < 6) {
      setLinkError('Password must be at least 6 characters.');
      return;
    }

    if (linkPassword !== linkPasswordConfirm) {
      setLinkError('Passwords do not match.');
      return;
    }

    setLinkPending(true);
    setLinkError(null);

    try {
      await linkAnonymousAccount({
        email: linkEmail,
        password: linkPassword,
        displayName: linkDisplayName,
      });
      setLinkPassword('');
      setLinkPasswordConfirm('');
      setLinkEmail('');
      Alert.alert('Account secured', 'This session is now linked to your email and password.');
    } catch (secureError) {
      setLinkError(secureError instanceof Error ? secureError.message : 'Failed to secure the account.');
    } finally {
      setLinkPending(false);
    }
  }

  function closeSoundPicker(): void {
    stopPreview();
    setSoundPicker(null);
  }

  async function handleSelectSound(soundId: string): Promise<void> {
    if (!profile || !soundPicker) {
      return;
    }

    setSoundPending(true);
    setSoundError(null);

    try {
      await updateProfile(
        soundPicker === 'alarm' ? { alarmSoundId: soundId } : { reminderSoundId: soundId },
      );
      closeSoundPicker();
    } catch (selectionError) {
      setSoundError(selectionError instanceof Error ? selectionError.message : 'Failed to save sound setting.');
    } finally {
      setSoundPending(false);
    }
  }

  function handleSelectTimezone(nextValue: string): void {
    setTimezone(nextValue);
    setSelectionPicker(null);
  }

  function handleSelectLocale(nextValue: string): void {
    setLocale(nextValue);
    setSelectionPicker(null);
  }

  function getConnection(provider: CalendarConnectionProvider): CalendarConnectionRecord | null {
    return connections.find((connection) => connection.provider === provider) ?? null;
  }

  function formatSyncTimestamp(value: Date | null): string {
    if (!value) {
      return 'No successful sync yet.';
    }

    return `Last sync ${value.toLocaleString()}`;
  }

  function getConnectionDescription(provider: CalendarConnectionProvider): string {
    if (isAnonymous) {
      return 'Secure your account before connecting external calendars.';
    }

    const connection = getConnection(provider);
    if (!connection) {
      return `No ${getCalendarProviderLabel(provider)} connection has been established yet. ${getProviderSetupMessage(provider)}`;
    }

    const selectedCount = connection.calendars.filter((calendar) => calendar.isSelected).length;
    const statusLabel = formatCalendarSyncStatus(connection.lastSyncStatus);
    const accountLabel = connection.accountLabel || 'Connected account';

    return `${accountLabel}. ${selectedCount} calendars selected. ${statusLabel}. ${formatSyncTimestamp(connection.lastSyncAt)}`;
  }

  function getConnectionTrailingText(provider: CalendarConnectionProvider): string {
    if (isAnonymous) {
      return 'Secure account first';
    }

    const connection = getConnection(provider);
    if (connection) {
      return 'Manage';
    }

    return providerEnvStatus[provider].isConfigured ? 'Ready to connect' : 'Setup incomplete';
  }

  function handleOpenConnection(provider: CalendarConnectionProvider): void {
    setConnectionError(null);

    if (isAnonymous) {
      setConnectionError('Secure your account before connecting external calendars.');
      return;
    }

    const connection = getConnection(provider);
    if (!connection) {
      setConnectionError(
        `${getCalendarProviderLabel(provider)} is approved for M6, but the first connection still depends on provider credentials and backend setup. ${getProviderSetupMessage(provider)}`,
      );
      return;
    }

    setActiveConnectionProvider(provider);
  }

  function closeConnectionModal(): void {
    setActiveConnectionProvider(null);
    setConnectionError(null);
  }

  function closeIcsModal(): void {
    setIcsModalVisible(false);
    setIcsError(null);
    setIcsFeedback(null);
  }

  async function handleToggleCalendar(calendarId: string): Promise<void> {
    const connection = activeConnectionProvider ? getConnection(activeConnectionProvider) : null;
    if (!connection) {
      return;
    }

    setConnectionPending(true);
    setConnectionError(null);

    try {
      const nextCalendars = connection.calendars.map((calendar) =>
        calendar.id === calendarId
          ? { ...calendar, isSelected: !calendar.isSelected }
          : calendar,
      );

      await updateConnectionCalendars(connection.id, nextCalendars);
    } catch (selectionError) {
      setConnectionError(
        selectionError instanceof Error ? selectionError.message : 'Failed to update calendar selection.',
      );
    } finally {
      setConnectionPending(false);
    }
  }

  async function handleToggleConnectionSync(): Promise<void> {
    const connection = activeConnectionProvider ? getConnection(activeConnectionProvider) : null;
    if (!connection) {
      return;
    }

    setConnectionPending(true);
    setConnectionError(null);

    try {
      await updateConnectionSyncEnabled(connection.id, !connection.syncEnabled);
    } catch (syncError) {
      setConnectionError(syncError instanceof Error ? syncError.message : 'Failed to update sync setting.');
    } finally {
      setConnectionPending(false);
    }
  }

  async function handleDisconnectActiveConnection(): Promise<void> {
    const connection = activeConnectionProvider ? getConnection(activeConnectionProvider) : null;
    if (!connection) {
      return;
    }

    setConnectionPending(true);
    setConnectionError(null);

    try {
      await disconnectConnection(connection.id);
      closeConnectionModal();
    } catch (disconnectError) {
      setConnectionError(
        disconnectError instanceof Error ? disconnectError.message : 'Failed to disconnect calendar.',
      );
    } finally {
      setConnectionPending(false);
    }
  }

  async function handleExportIcs(shareAfterExport: boolean): Promise<void> {
    if (!authUser) {
      setIcsError('User is not authenticated.');
      return;
    }

    setIcsPending(true);
    setIcsError(null);
    setIcsFeedback(null);

    try {
      const events = await listUserEvents(authUser.uid);
      const exportableEvents = events.filter((event) => event.status !== 'canceled');

      if (exportableEvents.length === 0) {
        throw new Error('No exportable events are available yet.');
      }

      const filename = buildIcsFilename();
      const icsContent = serializeEventsToIcs(exportableEvents);

      if (Platform.OS === 'web') {
        await downloadIcsFileOnWeb(filename, icsContent);
        setIcsFeedback(
          shareAfterExport
            ? 'Web downloaded the .ics file because direct local-file sharing is not available there.'
            : `Downloaded ${filename}.`,
        );
        return;
      }

      const fileUri = await writeIcsExportFile(filename, icsContent);

      if (shareAfterExport) {
        const shared = await shareIcsExportFile(fileUri);
        setIcsFeedback(shared ? 'Shared the .ics export.' : `Saved ${filename} to ${fileUri}.`);
        return;
      }

      setIcsFeedback(`Saved ${filename} to ${fileUri}.`);
    } catch (exportError) {
      setIcsError(exportError instanceof Error ? exportError.message : 'Failed to export .ics file.');
    } finally {
      setIcsPending(false);
    }
  }

  async function handleImportIcs(): Promise<void> {
    if (!authUser) {
      setIcsError('User is not authenticated.');
      return;
    }

    setIcsPending(true);
    setIcsError(null);
    setIcsFeedback(null);

    try {
      const content = await pickIcsFileContent();
      if (!content) {
        setIcsFeedback('Import canceled.');
        return;
      }

      const parsed = parseIcsCalendar(content);
      const existingEvents = await listUserEvents(authUser.uid);
      const existingImportedExternalIds = new Set(
        existingEvents
          .filter((event) => event.source === 'ics_import' && event.externalEventId)
          .map((event) => event.externalEventId as string),
      );

      let importedCount = 0;
      let skippedCount = parsed.skippedEntries;

      for (const parsedEvent of parsed.events) {
        if (existingImportedExternalIds.has(parsedEvent.uid)) {
          skippedCount += 1;
          continue;
        }

        await createMirroredEvent(authUser.uid, {
          title: parsedEvent.title,
          description: parsedEvent.description,
          startAt: parsedEvent.startAt,
          endAt: parsedEvent.endAt,
          timezone: parsedEvent.timezone,
          source: 'ics_import',
          externalEventId: parsedEvent.uid,
        });

        existingImportedExternalIds.add(parsedEvent.uid);
        importedCount += 1;
      }

      if (importedCount === 0) {
        throw new Error('No supported timed events were imported from the selected .ics file.');
      }

      setIcsFeedback(
        skippedCount > 0
          ? `Imported ${importedCount} events and skipped ${skippedCount} duplicate or unsupported entries.`
          : `Imported ${importedCount} events.`,
      );
    } catch (importError) {
      setIcsError(importError instanceof Error ? importError.message : 'Failed to import .ics file.');
    } finally {
      setIcsPending(false);
    }
  }

  const activeConnection = activeConnectionProvider ? getConnection(activeConnectionProvider) : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ScreenHeader
          eyebrow="Profile"
          title="Profile"
          description="Manage your account, settings, sounds, and a few small prompts that keep the app useful every day."
        />

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading profile...</Text>
            <Text style={styles.stateDescription}>Fetching your account settings and sound preferences.</Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Unable to load profile.</Text>
            <Text style={styles.stateDescription}>{error?.message ?? 'Try again in a moment.'}</Text>
          </AppCard>
        ) : null}

        {profile ? (
          <>
            <AppCard style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Account settings</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  accessibilityLabel="Profile display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  style={styles.input}
                />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Email</Text>
                <Text style={styles.metaValue}>{email || 'Anonymous session'}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Timezone</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open timezone picker"
                  onPress={() => setSelectionPicker('timezone')}
                  style={({ pressed }) => [styles.selectionButton, pressed ? styles.buttonPressed : null]}
                >
                  <Text style={styles.selectionLabel}>Timezone</Text>
                  <Text style={styles.selectionValue}>
                    {getProfileSelectionLabel(
                      PROFILE_TIMEZONE_OPTIONS,
                      timezone,
                      timezone || 'Select a timezone',
                    )}
                  </Text>
                  <Text style={styles.selectionMeta}>{timezone || 'Select a timezone'}</Text>
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Locale</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open locale picker"
                  onPress={() => setSelectionPicker('locale')}
                  style={({ pressed }) => [styles.selectionButton, pressed ? styles.buttonPressed : null]}
                >
                  <Text style={styles.selectionLabel}>Locale</Text>
                  <Text style={styles.selectionValue}>
                    {getProfileSelectionLabel(PROFILE_LOCALE_OPTIONS, locale, locale || 'Select a locale')}
                  </Text>
                  <Text style={styles.selectionMeta}>{locale || 'Select a locale'}</Text>
                </Pressable>
              </View>

              {accountError ? <Text style={styles.errorText}>{accountError}</Text> : null}
              {accountFeedback ? <Text style={styles.successText}>{accountFeedback}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save account settings"
                onPress={() => void handleSaveAccountSettings()}
                disabled={accountPending}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !accountPending ? styles.buttonPressed : null,
                  accountPending ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.primaryButtonText}>{accountPending ? 'Saving...' : 'Save Account Settings'}</Text>
              </Pressable>
            </AppCard>

            {isAnonymous ? (
              <AppCard style={styles.cardSection}>
                <Text style={styles.sectionTitle}>Secure this anonymous session</Text>
                <Text style={styles.stateDescription}>Add email and password to keep the same app data while turning this session into a real account.</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Display name</Text>
                  <TextInput
                    accessibilityLabel="Secure account display name"
                    value={linkDisplayName}
                    onChangeText={setLinkDisplayName}
                    placeholder="Your name"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    accessibilityLabel="Secure account email"
                    value={linkEmail}
                    onChangeText={setLinkEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    accessibilityLabel="Secure account password"
                    value={linkPassword}
                    onChangeText={setLinkPassword}
                    secureTextEntry
                    placeholder="At least 6 characters"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Confirm password</Text>
                  <TextInput
                    accessibilityLabel="Secure account confirm password"
                    value={linkPasswordConfirm}
                    onChangeText={setLinkPasswordConfirm}
                    secureTextEntry
                    placeholder="Re-enter password"
                    style={styles.input}
                  />
                </View>

                {linkError ? <Text style={styles.errorText}>{linkError}</Text> : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Secure anonymous account"
                  onPress={() => void handleLinkAnonymousAccount()}
                  disabled={linkPending}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !linkPending ? styles.buttonPressed : null,
                    linkPending ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{linkPending ? 'Securing...' : 'Secure Account'}</Text>
                </Pressable>
              </AppCard>
            ) : (
              <View style={styles.actionBlock}>
                <ListItem
                  onPress={() => void handleSendPasswordReset()}
                  title="Reset password"
                  description="Send a Firebase reset email to the current account address."
                  trailingText={passwordResetPending ? 'Working...' : 'Send'}
                  disabled={passwordResetPending}
                />
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tips and wisdom"
              onPress={handleOpenTipModal}
              style={({ pressed }) => [styles.tipsButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.tipsButtonText}>Tips & Wisdom</Text>
            </Pressable>

            <View style={styles.actionBlock}>
              <ListItem
                onPress={() => setSoundPicker('alarm')}
                title="Timer sound"
                description="Pick the sound used when timer-style alerts finish."
                trailingText={getProfileSoundOption(profile.alarmSoundId).label}
              />
              <ListItem
                onPress={() => setSoundPicker('reminder')}
                title="Reminder sound"
                description="Pick the sound used before scheduled events."
                trailingText={getProfileSoundOption(profile.reminderSoundId).label}
              />
              {soundError ? <Text style={styles.errorText}>{soundError}</Text> : null}
            </View>

            <View style={styles.actionBlock}>
              <ListItem
                title="Premium access"
                description="Purchases, restore, and entitlement management arrive in the monetization milestone."
                trailingText="Coming soon"
                disabled
              />
              <ListItem
                onPress={() => handleOpenConnection('google')}
                title="Google Calendar"
                description={getConnectionDescription('google')}
                trailingText={getConnectionTrailingText('google')}
                disabled={isAnonymous}
              />
              <ListItem
                onPress={() => handleOpenConnection('microsoft')}
                title="Microsoft Calendar"
                description={getConnectionDescription('microsoft')}
                trailingText={getConnectionTrailingText('microsoft')}
                disabled={isAnonymous}
              />
              <ListItem
                onPress={() => setIcsModalVisible(true)}
                title="Apple Calendar"
                description="Apple support is limited to .ics import and export in this milestone."
                trailingText="Open"
              />
              {connectionsUiState === 'error' ? <Text style={styles.errorText}>Unable to load calendar connection state.</Text> : null}
              {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}
            </View>

            <View style={styles.actionBlock}>
              <ListItem
                onPress={onPressSignOut}
                title="Sign Out"
                description="End the current session on this device."
                trailingText={isSignOutPending ? 'Working...' : 'Action'}
                disabled={isSignOutPending}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      <SoundPickerModal
        visible={soundPicker !== null && profile !== null}
        title={soundPicker === 'alarm' ? 'Choose Timer Sound' : 'Choose Reminder Sound'}
        selectedSoundId={
          soundPicker === 'alarm' ? profile?.alarmSoundId ?? '' : profile?.reminderSoundId ?? ''
        }
        playingSoundId={playingSoundId}
        previewError={previewError}
        savePending={soundPending}
        onClose={closeSoundPicker}
        onPreview={previewSound}
        onSelect={handleSelectSound}
      />

      <ProfileSelectionModal
        visible={selectionPicker === 'timezone'}
        title="Timezone"
        searchPlaceholder="Search timezones by city or region"
        selectedValue={timezone}
        options={PROFILE_TIMEZONE_OPTIONS}
        onClose={() => setSelectionPicker(null)}
        onSelect={handleSelectTimezone}
      />

      <ProfileSelectionModal
        visible={selectionPicker === 'locale'}
        title="Locale"
        searchPlaceholder="Search locales by language or country"
        selectedValue={locale}
        options={PROFILE_LOCALE_OPTIONS}
        onClose={() => setSelectionPicker(null)}
        onSelect={handleSelectLocale}
      />

      <TipsWisdomModal
        visible={tipModalVisible}
        tip={activeTip}
        onClose={() => setTipModalVisible(false)}
        onRefresh={handleRefreshTip}
      />

      <AppModal
        visible={activeConnection !== null}
        title={activeConnection ? getCalendarProviderLabel(activeConnection.provider) : 'Calendar Connection'}
        onClose={closeConnectionModal}
      >
        {activeConnection ? (
          <>
            <View style={styles.connectionMetaBlock}>
              <Text style={styles.sectionTitle}>{activeConnection.accountLabel || 'Connected account'}</Text>
              <Text style={styles.stateDescription}>{formatSyncTimestamp(activeConnection.lastSyncAt)}</Text>
              <Text style={styles.stateDescription}>
                {formatCalendarSyncStatus(activeConnection.lastSyncStatus)}
                {activeConnection.lastErrorMessage ? ` • ${activeConnection.lastErrorMessage}` : ''}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle automatic sync"
              onPress={() => void handleToggleConnectionSync()}
              disabled={connectionPending}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && !connectionPending ? styles.buttonPressed : null,
                connectionPending ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.secondaryActionButtonText}>
                {connectionPending
                  ? 'Working...'
                  : activeConnection.syncEnabled
                    ? 'Pause Automatic Sync'
                    : 'Enable Automatic Sync'}
              </Text>
            </Pressable>

            <View style={styles.connectionCalendarBlock}>
              <Text style={styles.sectionTitle}>Visible calendars</Text>
              {activeConnection.calendars.length > 0 ? (
                activeConnection.calendars.map((calendar) => (
                  <Pressable
                    key={calendar.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select calendar ${calendar.label}`}
                    onPress={() => void handleToggleCalendar(calendar.id)}
                    disabled={connectionPending}
                    style={({ pressed }) => [
                      styles.calendarSelectionRow,
                      calendar.isSelected ? styles.calendarSelectionRowSelected : null,
                      pressed && !connectionPending ? styles.buttonPressed : null,
                      connectionPending ? styles.buttonDisabled : null,
                    ]}
                  >
                    <View style={styles.calendarSelectionCopy}>
                      <Text style={styles.selectionValue}>{calendar.label}</Text>
                      <Text style={styles.selectionMeta}>
                        {calendar.isPrimary ? 'Primary calendar' : 'Additional calendar'}
                      </Text>
                    </View>
                    <Text style={styles.optionStateText}>{calendar.isSelected ? 'Visible' : 'Hidden'}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.stateDescription}>
                  This connection has not published selectable calendars yet.
                </Text>
              )}
            </View>

            {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Disconnect calendar"
              onPress={() => void handleDisconnectActiveConnection()}
              disabled={connectionPending}
              style={({ pressed }) => [
                styles.disconnectButton,
                pressed && !connectionPending ? styles.buttonPressed : null,
                connectionPending ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.disconnectButtonText}>
                {connectionPending ? 'Disconnecting...' : 'Disconnect Calendar'}
              </Text>
            </Pressable>
          </>
        ) : null}
      </AppModal>

      <AppModal visible={icsModalVisible} title="Apple Calendar (.ics)" onClose={closeIcsModal}>
        <Text style={styles.stateDescription}>
          Import and export timed events with Apple Calendar compatible .ics files. This first slice skips recurring events, all-day events, attendees, conference links, and reminders.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import ics file"
          onPress={() => void handleImportIcs()}
          disabled={icsPending}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            pressed && !icsPending ? styles.buttonPressed : null,
            icsPending ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.secondaryActionButtonText}>{icsPending ? 'Working...' : 'Import .ics File'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export ics file"
          onPress={() => void handleExportIcs(false)}
          disabled={icsPending}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            pressed && !icsPending ? styles.buttonPressed : null,
            icsPending ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.secondaryActionButtonText}>{icsPending ? 'Working...' : 'Export .ics File'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share ics file"
          onPress={() => void handleExportIcs(true)}
          disabled={icsPending}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            pressed && !icsPending ? styles.buttonPressed : null,
            icsPending ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.secondaryActionButtonText}>{icsPending ? 'Working...' : 'Share .ics File'}</Text>
        </Pressable>

        {icsError ? <Text style={styles.errorText}>{icsError}</Text> : null}
        {icsFeedback ? <Text style={styles.successText}>{icsFeedback}</Text> : null}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: layout.pagePaddingHorizontal,
    paddingVertical: layout.pagePaddingVertical,
    gap: spacing.xl,
    paddingBottom: 120,
  },
  stateTitle: {
    ...typography.button,
    color: colors.text,
  },
  stateDescription: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  cardSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.button,
    color: colors.text,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  selectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  selectionValue: {
    ...typography.body,
    color: colors.text,
  },
  selectionMeta: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  metaRow: {
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
  },
  primaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  successText: {
    ...typography.helper,
    color: colors.brand,
  },
  actionBlock: {
    gap: spacing.md,
  },
  connectionMetaBlock: {
    gap: spacing.xs,
  },
  connectionCalendarBlock: {
    gap: spacing.sm,
  },
  secondaryActionButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryActionButtonText: {
    ...typography.button,
    color: colors.text,
  },
  calendarSelectionRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  calendarSelectionRowSelected: {
    backgroundColor: colors.surfaceBrand,
  },
  calendarSelectionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  optionStateText: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '600',
  },
  disconnectButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerText,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disconnectButtonText: {
    ...typography.button,
    color: colors.dangerText,
  },
  tipsButton: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  tipsButtonText: {
    ...typography.button,
    color: colors.brand,
  },
});
