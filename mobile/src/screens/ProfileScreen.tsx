import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppModal } from '../components/ui/AppModal';
import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { ProfileSelectionModal } from '../components/profile/ProfileSelectionModal';
import { SoundPickerModal } from '../components/profile/SoundPickerModal';
import { TipsWisdomModal } from '../components/profile/TipsWisdomModal';
import { AppCard } from '../components/ui/AppCard';
import { ListItem } from '../components/ui/ListItem';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeading } from '../components/ui/SectionHeading';
import { colors, layout, radii, spacing, typography } from '../design/tokens';
import {
  buildIcsFilename,
  downloadIcsFileOnWeb,
  shareIcsExportFile,
  writeIcsExportFile,
} from '../features/calendar/icsFileInterop';
import { serializeEventsToIcs } from '../features/calendar/icsInterop';
import { useDeviceCalendars } from '../features/calendar/useDeviceCalendars';
import {
  getProfileSelectionLabel,
  PROFILE_LOCALE_OPTIONS,
  PROFILE_TIMEZONE_OPTIONS,
} from '../features/profile/profileOptions';
import {
  PremiumFeature,
  getPremiumEntitlementLabel,
  hasActivePremiumStatus,
} from '../features/premium/premiumAccess';
import { getProfileSoundOption } from '../features/profile/profileSounds';
import { getDifferentRandomProfileTip } from '../features/profile/profileTips';
import { useSoundPreview } from '../features/profile/useSoundPreview';
import { useUserProfile } from '../features/profile/useUserProfile';
import { ProfileTip } from '../features/profile/profileTypes';
import { listUserEvents } from '../services/firebase/firebaseEvents';

type ProfileScreenProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

export function ProfileScreen({ onPressSignOut, isSignOutPending }: ProfileScreenProps) {
  const {
    authUser,
    profile,
    uiState,
    error,
    isAnonymous,
    email,
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
  } = useUserProfile();
  const deviceCalendars = useDeviceCalendars(authUser?.uid ?? null);
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
  const [deviceCalendarsModalVisible, setDeviceCalendarsModalVisible] = useState(false);
  const [deviceCalendarPending, setDeviceCalendarPending] = useState(false);
  const [deviceCalendarError, setDeviceCalendarError] = useState<string | null>(null);
  const [premiumPaywallFeature, setPremiumPaywallFeature] = useState<PremiumFeature | null>(null);
  const [icsModalVisible, setIcsModalVisible] = useState(false);
  const [icsPending, setIcsPending] = useState(false);
  const [icsError, setIcsError] = useState<string | null>(null);
  const [icsFeedback, setIcsFeedback] = useState<string | null>(null);
  const hasPremiumAccess = hasActivePremiumStatus(profile?.premiumStatus);

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
      setAccountError(
        saveError instanceof Error ? saveError.message : 'Failed to save account settings.',
      );
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
      setAccountError(
        resetError instanceof Error ? resetError.message : 'Failed to send password reset email.',
      );
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
      setLinkError(
        secureError instanceof Error ? secureError.message : 'Failed to secure the account.',
      );
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
      setSoundError(
        selectionError instanceof Error ? selectionError.message : 'Failed to save sound setting.',
      );
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

  function closePremiumPaywall(): void {
    setPremiumPaywallFeature(null);
  }

  function getPremiumAccessDescription(): string {
    if (hasPremiumAccess) {
      return 'Premium is active for AI goal builder access. Store purchase and restore wiring still land in the monetization milestone.';
    }

    if (profile?.premiumStatus === 'canceled') {
      return 'Premium access is not active. Rejoin to unlock AI goal builder access when live billing ships.';
    }

    return 'AI goal builder access is reserved for Bearing Premium. Device calendar access remains free. This in-app paywall is ready before live store checkout is connected.';
  }

  function closeIcsModal(): void {
    setIcsModalVisible(false);
    setIcsError(null);
    setIcsFeedback(null);
  }

  async function runDeviceCalendarAction(action: () => Promise<void>): Promise<void> {
    setDeviceCalendarPending(true);
    setDeviceCalendarError(null);

    try {
      await action();
    } catch (calendarError) {
      setDeviceCalendarError(
        calendarError instanceof Error
          ? calendarError.message
          : 'Failed to update device calendar settings.',
      );
    } finally {
      setDeviceCalendarPending(false);
    }
  }

  function getDeviceCalendarDescription(): string {
    if (deviceCalendars.uiState === 'unavailable') {
      return 'Available in iOS and Android development builds.';
    }
    if (deviceCalendars.permission !== 'granted') {
      return 'Grant free device calendar access to choose visible and writable calendars.';
    }

    const defaultCalendar = deviceCalendars.calendars.find(
      (calendar) => calendar.id === deviceCalendars.defaultCalendarId,
    );
    return `${deviceCalendars.selectedCalendarIds.length} visible. Default: ${defaultCalendar?.title ?? 'Bearing only'}.`;
  }

  function getDeviceCalendarTrailingText(): string {
    switch (deviceCalendars.permission) {
      case 'granted':
        return 'Manage';
      case 'blocked':
        return 'Settings';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Allow access';
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
      setIcsError(
        exportError instanceof Error ? exportError.message : 'Failed to export .ics file.',
      );
    } finally {
      setIcsPending(false);
    }
  }

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
            <Text style={styles.stateDescription}>
              Fetching your account settings and sound preferences.
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Unable to load profile.</Text>
            <Text style={styles.stateDescription}>
              {error?.message ?? 'Try again in a moment.'}
            </Text>
          </AppCard>
        ) : null}

        {profile ? (
          <>
            <View style={styles.section}>
              <SectionHeading title="Account" description="Your identity in Bearing." />
              <View style={styles.identitySummary}>
                <View style={styles.identityMark}>
                  <Text style={styles.identityInitial}>
                    {(displayName || email || '?').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.identityCopy}>
                  <Text numberOfLines={1} style={styles.identityName}>
                    {displayName || 'Unnamed account'}
                  </Text>
                  <Text numberOfLines={1} style={styles.identityEmail}>
                    {email || 'Anonymous session'}
                  </Text>
                </View>
              </View>
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
            </View>

            <View style={styles.section}>
              <SectionHeading title="Security" description="Protect access to this account." />
              {isAnonymous ? (
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionTitle}>Secure this anonymous session</Text>
                  <Text style={styles.stateDescription}>
                    Add email and password to keep the same app data while turning this session into
                    a real account.
                  </Text>

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
                    <Text style={styles.primaryButtonText}>
                      {linkPending ? 'Securing...' : 'Secure Account'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <ListItem
                  onPress={() => void handleSendPasswordReset()}
                  title="Reset password"
                  description="Send a Firebase reset email to the current account address."
                  trailingText={passwordResetPending ? 'Working...' : 'Send'}
                  disabled={passwordResetPending}
                />
              )}
            </View>

            <View style={styles.section}>
              <SectionHeading
                title="Preferences"
                description="Set your region, prompts, and alert sounds."
              />
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Timezone</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open timezone picker"
                  onPress={() => setSelectionPicker('timezone')}
                  style={({ pressed }) => [
                    styles.selectionButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
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
                  style={({ pressed }) => [
                    styles.selectionButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.selectionLabel}>Locale</Text>
                  <Text style={styles.selectionValue}>
                    {getProfileSelectionLabel(
                      PROFILE_LOCALE_OPTIONS,
                      locale,
                      locale || 'Select a locale',
                    )}
                  </Text>
                  <Text style={styles.selectionMeta}>{locale || 'Select a locale'}</Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tips and wisdom"
                onPress={handleOpenTipModal}
                style={({ pressed }) => [styles.tipsButton, pressed ? styles.buttonPressed : null]}
              >
                <Text style={styles.tipsButtonText}>Tips & Wisdom</Text>
              </Pressable>

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
                <Text style={styles.primaryButtonText}>
                  {accountPending ? 'Saving...' : 'Save Preferences'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <SectionHeading
                title="Calendars & Data"
                description="Connect device calendars and take your events with you."
              />
              <ListItem
                onPress={() => setDeviceCalendarsModalVisible(true)}
                title="Device calendars"
                description={getDeviceCalendarDescription()}
                trailingText={getDeviceCalendarTrailingText()}
              />
              <ListItem
                onPress={() => setIcsModalVisible(true)}
                title="Export calendar"
                description="Export Bearing events to a general .ics file."
                trailingText="Export"
              />
            </View>

            <View style={styles.section}>
              <SectionHeading title="Plan" description="Review your current Bearing access." />
              <ListItem
                onPress={
                  !hasPremiumAccess ? () => setPremiumPaywallFeature('premium_overview') : undefined
                }
                title="Premium access"
                description={getPremiumAccessDescription()}
                trailingText={
                  hasPremiumAccess
                    ? getPremiumEntitlementLabel(profile.premiumStatus)
                    : 'View plans'
                }
                disabled={hasPremiumAccess}
              />
            </View>

            <View style={styles.section}>
              <SectionHeading title="Session" description="Manage this device session." />
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
          soundPicker === 'alarm' ? (profile?.alarmSoundId ?? '') : (profile?.reminderSoundId ?? '')
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

      <PremiumPaywallModal
        visible={premiumPaywallFeature !== null}
        feature={premiumPaywallFeature}
        isAnonymous={isAnonymous}
        onClose={closePremiumPaywall}
      />

      <AppModal
        visible={deviceCalendarsModalVisible}
        title="Device Calendars"
        onClose={() => {
          setDeviceCalendarsModalVisible(false);
          setDeviceCalendarError(null);
        }}
      >
        <>
          <Text style={styles.stateDescription}>{getDeviceCalendarDescription()}</Text>

          {deviceCalendars.permission !== 'granted' &&
          deviceCalendars.permission !== 'unavailable' &&
          deviceCalendars.permission !== 'blocked' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Allow device calendar access"
              onPress={() => void runDeviceCalendarAction(deviceCalendars.requestPermission)}
              disabled={deviceCalendarPending}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && !deviceCalendarPending ? styles.buttonPressed : null,
                deviceCalendarPending ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.secondaryActionButtonText}>
                {deviceCalendarPending ? 'Working...' : 'Allow Calendar Access'}
              </Text>
            </Pressable>
          ) : null}

          {deviceCalendars.permission === 'blocked' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open device settings"
              onPress={() => void runDeviceCalendarAction(deviceCalendars.openSettings)}
              disabled={deviceCalendarPending}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && !deviceCalendarPending ? styles.buttonPressed : null,
                deviceCalendarPending ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.secondaryActionButtonText}>Open Settings</Text>
            </Pressable>
          ) : null}

          {deviceCalendars.permission === 'granted' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh device calendars"
                onPress={() => void runDeviceCalendarAction(deviceCalendars.refresh)}
                disabled={deviceCalendarPending}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  pressed && !deviceCalendarPending ? styles.buttonPressed : null,
                  deviceCalendarPending ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {deviceCalendarPending ? 'Refreshing...' : 'Refresh Calendars'}
                </Text>
              </Pressable>

              <View style={styles.connectionCalendarBlock}>
                <Text style={styles.sectionTitle}>Visible calendars</Text>
                {deviceCalendars.calendars.length > 0 ? (
                  deviceCalendars.calendars.map((calendar) => (
                    <Pressable
                      key={calendar.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle visible calendar ${calendar.title}`}
                      onPress={() =>
                        void runDeviceCalendarAction(() =>
                          deviceCalendars.toggleCalendar(calendar.id),
                        )
                      }
                      disabled={deviceCalendarPending}
                      style={({ pressed }) => [
                        styles.calendarSelectionRow,
                        deviceCalendars.selectedCalendarIds.includes(calendar.id)
                          ? styles.calendarSelectionRowSelected
                          : null,
                        pressed && !deviceCalendarPending ? styles.buttonPressed : null,
                        deviceCalendarPending ? styles.buttonDisabled : null,
                      ]}
                    >
                      <View style={styles.calendarSelectionCopy}>
                        <Text style={styles.selectionValue}>{calendar.title}</Text>
                        <Text style={styles.selectionMeta}>
                          {calendar.sourceLabel}
                          {calendar.isPrimary ? ' • Primary' : ''}
                          {!calendar.allowsModifications ? ' • Read only' : ''}
                        </Text>
                      </View>
                      <Text style={styles.optionStateText}>
                        {deviceCalendars.selectedCalendarIds.includes(calendar.id)
                          ? 'Visible'
                          : 'Hidden'}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.stateDescription}>No system calendars were found.</Text>
                )}
              </View>

              <View style={styles.connectionCalendarBlock}>
                <Text style={styles.sectionTitle}>Writable default</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use Bearing only for event creation"
                  onPress={() =>
                    void runDeviceCalendarAction(() => deviceCalendars.setDefaultCalendar(null))
                  }
                  disabled={deviceCalendarPending}
                  style={({ pressed }) => [
                    styles.calendarSelectionRow,
                    deviceCalendars.defaultCalendarId === null
                      ? styles.calendarSelectionRowSelected
                      : null,
                    pressed && !deviceCalendarPending ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.selectionValue}>Bearing only</Text>
                  <Text style={styles.optionStateText}>
                    {deviceCalendars.defaultCalendarId === null ? 'Default' : 'Choose'}
                  </Text>
                </Pressable>
                {deviceCalendars.calendars
                  .filter((calendar) => calendar.allowsModifications)
                  .map((calendar) => (
                    <Pressable
                      key={calendar.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Use default calendar ${calendar.title}`}
                      onPress={() =>
                        void runDeviceCalendarAction(() =>
                          deviceCalendars.setDefaultCalendar(calendar.id),
                        )
                      }
                      disabled={deviceCalendarPending}
                      style={({ pressed }) => [
                        styles.calendarSelectionRow,
                        deviceCalendars.defaultCalendarId === calendar.id
                          ? styles.calendarSelectionRowSelected
                          : null,
                        pressed && !deviceCalendarPending ? styles.buttonPressed : null,
                      ]}
                    >
                      <View style={styles.calendarSelectionCopy}>
                        <Text style={styles.selectionValue}>{calendar.title}</Text>
                        <Text style={styles.selectionMeta}>{calendar.sourceLabel}</Text>
                      </View>
                      <Text style={styles.optionStateText}>
                        {deviceCalendars.defaultCalendarId === calendar.id ? 'Default' : 'Choose'}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </>
          ) : null}

          {deviceCalendars.staleSelectionRecovered ? (
            <Text style={styles.errorText}>
              A saved calendar was removed or became read only. Bearing-only creation is still
              available.
            </Text>
          ) : null}
          {deviceCalendars.error ? (
            <Text style={styles.errorText}>{deviceCalendars.error.message}</Text>
          ) : null}
          {deviceCalendarError ? <Text style={styles.errorText}>{deviceCalendarError}</Text> : null}
        </>
      </AppModal>

      <AppModal visible={icsModalVisible} title="Calendar Export (.ics)" onClose={closeIcsModal}>
        <Text style={styles.stateDescription}>
          Export Bearing-owned events to a portable .ics file with all-day, timezone, recurrence,
          location, alarm, and link details.
        </Text>

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
          <Text style={styles.secondaryActionButtonText}>
            {icsPending ? 'Working...' : 'Export .ics File'}
          </Text>
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
          <Text style={styles.secondaryActionButtonText}>
            {icsPending ? 'Working...' : 'Share .ics File'}
          </Text>
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
  section: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionBody: {
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
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectionButton: {
    minHeight: 44,
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
  identitySummary: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  identityMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  identityInitial: {
    ...typography.button,
    color: colors.surface,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  identityName: {
    ...typography.button,
    color: colors.text,
  },
  identityEmail: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  primaryButton: {
    minHeight: 44,
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
    minHeight: 44,
    justifyContent: 'center',
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
