import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useThemedStyles } from '../design/useThemedStyles';
import { useTheme } from '../design/ThemeProvider';
import { AppButton } from '../components/ui/AppButton';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import { AppModal } from '../components/ui/AppModal';
import { FormField } from '../components/ui/FormField';
import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { CreditPackPurchaseModal } from '../components/premium/CreditPackPurchaseModal';
import { ProfileSelectionModal } from '../components/profile/ProfileSelectionModal';
import { LegalDocumentModal } from '../components/profile/LegalDocumentModal';
import { SoundPickerModal } from '../components/profile/SoundPickerModal';
import { TipsWisdomModal } from '../components/profile/TipsWisdomModal';
import { ProfileIdentityCard } from '../components/profile/ProfileIdentityCard';
import { AppCard } from '../components/ui/AppCard';
import { ListItem } from '../components/ui/ListItem';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeading } from '../components/ui/SectionHeading';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { IconButton } from '../components/ui/IconButton';
import { layout, radii, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import type { ThemePreference } from '../design/ThemeProvider';
import {
  buildIcsFilename,
  downloadIcsFileOnWeb,
  shareIcsExportFile,
  writeIcsExportFile,
} from '../features/calendar/icsFileInterop';
import { serializeEventsToIcs } from '../features/calendar/icsInterop';
import { useDeviceCalendars } from '../features/calendar/useDeviceCalendars';
import {
  cleanupLinkedCalendarCopies,
  purgeLocalAccountData,
} from '../features/profile/accountDeletionService';
import {
  LEGAL_DOCUMENTS,
  LegalDocumentId,
  getConfiguredSupportEmail,
} from '../features/profile/legalDocuments';
import {
  buildDataExportFilename,
  downloadDataExportOnWeb,
  serializeDataExport,
  shareDataExportFile,
  writeDataExportFile,
} from '../features/profile/dataExportFileInterop';
import {
  getProfileSelectionLabel,
  PROFILE_LOCALE_OPTIONS,
  PROFILE_TIMEZONE_OPTIONS,
} from '../features/profile/profileOptions';
import { TIME_FORMAT_OPTIONS, TimeFormat } from '../features/profile/timeFormat';
import { PremiumFeature, hasActivePremiumStatus } from '../features/premium/premiumAccess';
import {
  clearAiCreditBalance,
  setAiCreditBalance,
  useAiCreditBalance,
} from '../features/premium/aiCreditBalance';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { getProfileSoundOption } from '../features/profile/profileSounds';
import { getDifferentRandomProfileTip } from '../features/profile/profileTips';
import { useSoundPreview } from '../features/profile/useSoundPreview';
import { useTelemetryConsent } from '../features/profile/useTelemetryConsent';
import { useUserProfile } from '../features/profile/useUserProfile';
import { ProfileTip } from '../features/profile/profileTypes';
import { listUserEvents } from '../services/firebase/firebaseEvents';
import { getAiCreditStatus } from '../services/firebase/firebaseAiGoalPlans';
import { reauthenticateCurrentUser } from '../services/firebase/firebaseAuthActions';
import {
  deleteCurrentUserAccount,
  exportCurrentUserData,
} from '../services/firebase/firebasePrivacy';
import { recordTelemetryEvent } from '../services/telemetry/telemetry';
import { showPremiumSubscriptionManagement } from '../services/purchases/revenueCatClient';
import type { ProfileStackParamList } from '../navigation/navigationTypes';

export type ProfileSection =
  | 'account'
  | 'security'
  | 'notifications'
  | 'focusPreferences'
  | 'appearance'
  | 'connectedServices'
  | 'plan'
  | 'subscription'
  | 'legal';

export type ProfileNavigationTarget = Exclude<keyof ProfileStackParamList, 'ProfileHome'>;

type ProfileScreenProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
  section?: ProfileSection;
  onPressBack?: () => void;
  navigation?: { navigate: (screen: ProfileNavigationTarget) => void };
};

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ProfileScreen({
  onPressSignOut,
  isSignOutPending,
  section: profileSection,
  onPressBack,
  navigation,
}: ProfileScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { preference: themePreference, setPreference: setThemePreference, theme } = useTheme();
  const {
    authUser,
    profile,
    uiState,
    error,
    isAnonymous,
    email,
    hasPasswordProvider,
    hasGoogleProvider,
    isGoogleAuthReady,
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
    linkGoogleAccount,
    disconnectGoogleAccount,
    reauthenticateWithGoogle,
    revokeGoogleAccess,
    retry: retryProfile,
  } = useUserProfile();
  const { entitlement } = usePremiumEntitlement(authUser?.uid ?? null);
  const deviceCalendars = useDeviceCalendars(authUser?.uid ?? null);
  const { previewSound, stopPreview, previewError, playingSoundId } = useSoundPreview();
  const telemetryConsent = useTelemetryConsent(authUser?.uid ?? null);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [timezonePickerVisible, setTimezonePickerVisible] = useState(false);
  const [timezonePending, setTimezonePending] = useState(false);
  const [timezoneError, setTimezoneError] = useState<string | null>(null);
  const [locale, setLocale] = useState('');
  const [localePickerVisible, setLocalePickerVisible] = useState(false);
  const [localePending, setLocalePending] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12-hour');
  const [timeFormatError, setTimeFormatError] = useState<string | null>(null);
  const [displayNamePending, setDisplayNamePending] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [themePreferencePending, setThemePreferencePending] = useState(false);
  const [themePreferenceError, setThemePreferenceError] = useState<string | null>(null);
  const [linkDisplayName, setLinkDisplayName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkPasswordConfirm, setLinkPasswordConfirm] = useState('');
  const [linkPending, setLinkPending] = useState(false);
  const [googleLinkPending, setGoogleLinkPending] = useState(false);
  const [disconnectGoogleVisible, setDisconnectGoogleVisible] = useState(false);
  const [googleDisconnectPending, setGoogleDisconnectPending] = useState(false);
  const [googleDisconnectError, setGoogleDisconnectError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [soundPicker, setSoundPicker] = useState<'alarm' | 'reminder' | null>(null);
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [activeTip, setActiveTip] = useState<ProfileTip | null>(null);
  const [soundPending, setSoundPending] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [passwordResetPending, setPasswordResetPending] = useState(false);
  const [deviceCalendarsModalVisible, setDeviceCalendarsModalVisible] = useState(false);
  const [deviceCalendarPending, setDeviceCalendarPending] = useState(false);
  const [deviceCalendarError, setDeviceCalendarError] = useState<string | null>(null);
  const [premiumPaywallFeature, setPremiumPaywallFeature] = useState<PremiumFeature | null>(null);
  const [premiumManagementPending, setPremiumManagementPending] = useState(false);
  const [premiumManagementError, setPremiumManagementError] = useState<string | null>(null);
  const [creditPackVisible, setCreditPackVisible] = useState(false);
  const aiCreditBalance = useAiCreditBalance(authUser?.uid ?? null);
  const [aiCreditBalanceLoading, setAiCreditBalanceLoading] = useState(false);
  const [aiCreditBalanceError, setAiCreditBalanceError] = useState<string | null>(null);
  const [icsModalVisible, setIcsModalVisible] = useState(false);
  const [icsPending, setIcsPending] = useState(false);
  const [icsError, setIcsError] = useState<string | null>(null);
  const [icsFeedback, setIcsFeedback] = useState<string | null>(null);
  const [dataExportVisible, setDataExportVisible] = useState(false);
  const [dataExportPending, setDataExportPending] = useState(false);
  const [dataExportError, setDataExportError] = useState<string | null>(null);
  const [dataExportFeedback, setDataExportFeedback] = useState<string | null>(null);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLinkedCopies, setDeleteLinkedCopies] = useState(true);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [legalDocumentId, setLegalDocumentId] = useState<LegalDocumentId | null>(null);
  const [legalError, setLegalError] = useState<string | null>(null);
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status);
  const isHubRoute = profileSection === undefined;

  const handleThemePreferenceChange = async (nextPreference: ThemePreference) => {
    setThemePreferencePending(true);
    setThemePreferenceError(null);
    try {
      await setThemePreference(nextPreference);
    } catch (preferenceError) {
      setThemePreferenceError(
        preferenceError instanceof Error
          ? preferenceError.message
          : 'Appearance preference could not be saved. Please retry.',
      );
    } finally {
      setThemePreferencePending(false);
    }
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setTimezone(profile.timezone);
    setLocale(profile.locale);
    setTimeFormat(profile.timeFormat);
    setLinkDisplayName((current) => current || profile.displayName);
  }, [profile]);

  async function handleSelectTimezone(nextValue: string): Promise<void> {
    setTimezone(nextValue);
    setTimezonePickerVisible(false);
    setTimezonePending(true);
    setTimezoneError(null);

    try {
      await updateProfile({ timezone: nextValue });
    } catch (selectionError) {
      setTimezoneError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Failed to save timezone preference.',
      );
    } finally {
      setTimezonePending(false);
    }
  }

  async function handleSelectLocale(nextValue: string): Promise<void> {
    setLocale(nextValue);
    setLocalePickerVisible(false);
    setLocalePending(true);
    setLocaleError(null);

    try {
      await updateProfile({ locale: nextValue });
    } catch (selectionError) {
      setLocaleError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Failed to save locale preference.',
      );
    } finally {
      setLocalePending(false);
    }
  }

  async function handleTimeFormatChange(nextValue: TimeFormat): Promise<void> {
    setTimeFormat(nextValue);
    setTimeFormatError(null);

    try {
      await updateProfile({ timeFormat: nextValue });
    } catch (selectionError) {
      setTimeFormatError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Failed to save time format preference.',
      );
    }
  }

  async function handleDisplayNameBlur(): Promise<void> {
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName || nextDisplayName === profile?.displayName) {
      return;
    }

    setDisplayNamePending(true);
    setDisplayNameError(null);
    try {
      await updateProfile({ displayName: nextDisplayName });
    } catch (saveError) {
      setDisplayNameError(
        saveError instanceof Error ? saveError.message : 'Failed to save display name.',
      );
    } finally {
      setDisplayNamePending(false);
    }
  }

  useEffect(() => {
    if (!authUser || isAnonymous || !hasPremiumAccess) {
      clearAiCreditBalance();
      setAiCreditBalanceError(null);
      return;
    }

    let current = true;
    setAiCreditBalanceLoading(true);
    setAiCreditBalanceError(null);
    void getAiCreditStatus()
      .then((status) => {
        if (current) setAiCreditBalance(authUser.uid, status.availableCredits);
      })
      .catch(() => {
        if (current) setAiCreditBalanceError('AI credit balance is unavailable right now.');
      })
      .finally(() => {
        if (current) setAiCreditBalanceLoading(false);
      });

    return () => {
      current = false;
    };
  }, [authUser, hasPremiumAccess, isAnonymous]);

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
      void recordTelemetryEvent('auth_result', {
        operation: 'password_reset',
        outcome: 'success',
      });
      Alert.alert('Password reset sent', `Check ${email ?? 'your inbox'} for the reset link.`);
    } catch (resetError) {
      void recordTelemetryEvent('auth_result', {
        operation: 'password_reset',
        outcome: 'failure',
      });
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
      void recordTelemetryEvent('auth_result', {
        operation: 'account_link',
        outcome: 'success',
      });
      setLinkPassword('');
      setLinkPasswordConfirm('');
      setLinkEmail('');
      Alert.alert('Account secured', 'This session is now linked to your email and password.');
    } catch (secureError) {
      void recordTelemetryEvent('auth_result', {
        operation: 'account_link',
        outcome: 'failure',
      });
      setLinkError(
        secureError instanceof Error ? secureError.message : 'Failed to secure the account.',
      );
    } finally {
      setLinkPending(false);
    }
  }

  async function handleLinkGoogleAccount(): Promise<void> {
    setGoogleLinkPending(true);
    setLinkError(null);

    try {
      const result = await linkGoogleAccount();
      if (result === 'cancelled') return;

      void recordTelemetryEvent('auth_result', {
        operation: 'account_link',
        outcome: 'success',
      });
      Alert.alert(
        isAnonymous ? 'Account secured' : 'Google connected',
        isAnonymous
          ? 'This session is now secured with Google and keeps the same Bearing data.'
          : 'Google Sign-In was added without changing your Bearing account or data.',
      );
    } catch (googleError) {
      void recordTelemetryEvent('auth_result', {
        operation: 'account_link',
        outcome: 'failure',
      });
      setLinkError(
        googleError instanceof Error ? googleError.message : 'Failed to connect Google.',
      );
    } finally {
      setGoogleLinkPending(false);
    }
  }

  function closeDisconnectGoogle(): void {
    if (googleDisconnectPending) return;
    setDisconnectGoogleVisible(false);
    setGoogleDisconnectError(null);
  }

  async function handleDisconnectGoogle(): Promise<void> {
    setGoogleDisconnectPending(true);
    setGoogleDisconnectError(null);

    try {
      await disconnectGoogleAccount();
      setDisconnectGoogleVisible(false);
      Alert.alert(
        'Google disconnected',
        'Continue signing in to this Bearing account with your email and password.',
      );
    } catch (disconnectError) {
      setGoogleDisconnectError(
        disconnectError instanceof Error
          ? disconnectError.message
          : 'Failed to disconnect Google Sign-In.',
      );
    } finally {
      setGoogleDisconnectPending(false);
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

  function closePremiumPaywall(): void {
    setPremiumPaywallFeature(null);
  }

  async function handleOpenSupport(): Promise<void> {
    const supportEmail = getConfiguredSupportEmail();
    if (!supportEmail) {
      setLegalError('Support contact is not configured in this build.');
      return;
    }

    setLegalError(null);
    try {
      await Linking.openURL(
        `mailto:${supportEmail}?subject=${encodeURIComponent('Bearing support request')}`,
      );
    } catch {
      setLegalError(`Unable to open email. Contact ${supportEmail}.`);
    }
  }

  function getPremiumAccessDescription(): string {
    if (hasPremiumAccess) {
      return 'Bearing 360 is active for AI goal builder access. Billing and cancellation are managed by the store account used to subscribe.';
    }

    if (entitlement?.status === 'canceled' || entitlement?.status === 'expired') {
      return 'Bearing 360 access is not active. Rejoin or restore purchases to unlock AI goal planning.';
    }

    return 'AI goal builder access is reserved for Bearing 360. Device calendar access remains free.';
  }

  function getPlanRenewalDescription(): string | undefined {
    if (!hasPremiumAccess || !entitlement?.periodEndAt) return undefined;
    const formattedDate = entitlement.periodEndAt.toLocaleDateString();
    return entitlement.autoRenew ? `Renews ${formattedDate}` : `Expires ${formattedDate}`;
  }

  async function handlePremiumAction(): Promise<void> {
    if (!hasPremiumAccess) {
      setPremiumManagementError(null);
      setPremiumPaywallFeature('premium_overview');
      return;
    }
    if (!authUser || isAnonymous) return;

    if (entitlement?.revenueCatStore === 'test_store') {
      setPremiumManagementError(
        'Subscription management is unavailable for RevenueCat Test Store purchases. Test Store access expires automatically.',
      );
      return;
    }

    if (Platform.OS === 'web' && entitlement?.platform === 'web') {
      setPremiumManagementError(
        'This subscription is not linked to an Apple or Google store account. Manage it from the store account used to purchase.',
      );
      return;
    }

    setPremiumManagementPending(true);
    setPremiumManagementError(null);
    try {
      await showPremiumSubscriptionManagement(authUser.uid, entitlement?.platform ?? null);
    } catch {
      setPremiumManagementError('Unable to open the store subscription settings for this account.');
    } finally {
      setPremiumManagementPending(false);
    }
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

    let outcome: 'success' | 'failure' = 'failure';
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
        outcome = 'success';
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
        outcome = 'success';
        setIcsFeedback(shared ? 'Shared the .ics export.' : `Saved ${filename} to ${fileUri}.`);
        return;
      }

      outcome = 'success';
      setIcsFeedback(`Saved ${filename} to ${fileUri}.`);
    } catch (exportError) {
      setIcsError(
        exportError instanceof Error ? exportError.message : 'Failed to export .ics file.',
      );
    } finally {
      void recordTelemetryEvent('calendar_export_result', {
        action: Platform.OS === 'web' ? 'download' : shareAfterExport ? 'share' : 'save',
        format: 'ics',
        outcome,
      });
      setIcsPending(false);
    }
  }

  async function handleExportData(shareAfterExport: boolean): Promise<void> {
    setDataExportPending(true);
    setDataExportError(null);
    setDataExportFeedback(null);

    let outcome: 'success' | 'failure' = 'failure';
    try {
      const content = serializeDataExport(await exportCurrentUserData());
      const filename = buildDataExportFilename();
      if (Platform.OS === 'web') {
        await downloadDataExportOnWeb(filename, content);
        outcome = 'success';
        setDataExportFeedback(`Downloaded ${filename}.`);
        return;
      }

      const uri = await writeDataExportFile(filename, content);
      if (shareAfterExport) {
        const shared = await shareDataExportFile(uri);
        outcome = 'success';
        setDataExportFeedback(shared ? 'Shared the JSON export.' : `Saved ${filename} to ${uri}.`);
      } else {
        outcome = 'success';
        setDataExportFeedback(`Saved ${filename} to ${uri}.`);
      }
    } catch (exportError) {
      setDataExportError(
        exportError instanceof Error ? exportError.message : 'Failed to export account data.',
      );
    } finally {
      void recordTelemetryEvent('calendar_export_result', {
        action: Platform.OS === 'web' ? 'download' : shareAfterExport ? 'share' : 'save',
        format: 'json',
        outcome,
      });
      setDataExportPending(false);
    }
  }

  function closeDeleteAccount(): void {
    if (deletePending) return;
    setDeleteAccountVisible(false);
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError(null);
  }

  async function handleDeleteAccount(): Promise<void> {
    if (!authUser) {
      setDeleteError('User is not authenticated.');
      return;
    }
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm permanent account deletion.');
      return;
    }
    if (hasPasswordProvider && !deletePassword) {
      setDeleteError('Enter the current password to continue.');
      return;
    }

    setDeletePending(true);
    setDeleteError(null);
    try {
      if (hasPasswordProvider) {
        await reauthenticateCurrentUser(deletePassword);
      } else if (hasGoogleProvider) {
        const result = await reauthenticateWithGoogle();
        if (result === 'cancelled') {
          setDeleteError('Google verification was cancelled. No account data was deleted.');
          return;
        }
      }
      if (deleteLinkedCopies) {
        const cleanup = await cleanupLinkedCalendarCopies(authUser.uid);
        if (cleanup.failedCount > 0) {
          throw new Error(
            `Could not remove ${cleanup.failedCount} linked system calendar ${cleanup.failedCount === 1 ? 'copy' : 'copies'}. Retry with calendar access or turn off linked-copy cleanup.`,
          );
        }
      }
      await deleteCurrentUserAccount();
      if (hasGoogleProvider) {
        await revokeGoogleAccess().catch(() => undefined);
      }
      const localCleanup = await purgeLocalAccountData(authUser.uid);
      setDeleteAccountVisible(false);
      Alert.alert(
        'Account deleted',
        localCleanup.failedCount === 0
          ? 'Bearing account data and local account settings were permanently deleted.'
          : 'Bearing account data was deleted. Clear this app’s local data in device settings to remove remaining local preferences.',
      );
      await onPressSignOut();
    } catch (deletionError) {
      setDeleteError(
        deletionError instanceof Error
          ? deletionError.message
          : 'Account deletion failed before completion. Please retry.',
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {onPressBack ? (
          <View style={styles.routeHeader}>
            <IconButton name="back" accessibilityLabel="Back to Profile" onPress={onPressBack} />
          </View>
        ) : profile ? null : (
          <ScreenHeader eyebrow="Profile" title="Profile" />
        )}

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading profile...</Text>
            <Text style={styles.stateDescription}>
              Fetching your account settings and sound preferences.
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <RecoveryCard
            title="Unable to load profile."
            description={error?.message ?? 'Check your connection, then retry.'}
            onRetry={retryProfile}
          />
        ) : null}

        {profile ? (
          <>
            {isHubRoute ? (
              <>
                <ProfileIdentityCard
                  displayName={displayName}
                  email={email ?? ''}
                  isPremium={hasPremiumAccess}
                />

                <View style={styles.section}>
                  <SectionHeading title="Account" variant="uppercase-accent" />
                  <ListItem
                    variant="row"
                    icon="personalInformation"
                    onPress={() => navigation?.navigate('PersonalInformation')}
                    title="Personal Information"
                  />
                  <ListItem
                    variant="row"
                    showDivider={false}
                    icon="security"
                    onPress={() => navigation?.navigate('Security')}
                    title="Security"
                  />
                </View>

                <View style={styles.section}>
                  <SectionHeading title="Connected Services" variant="uppercase-accent" />
                  <ListItem
                    variant="row"
                    icon="integrations"
                    onPress={() => setDeviceCalendarsModalVisible(true)}
                    title="Device Calendars"
                    trailingText={getDeviceCalendarTrailingText()}
                  />
                  <ListItem
                    variant="row"
                    showDivider={false}
                    icon="calendar"
                    onPress={() => setIcsModalVisible(true)}
                    title="Export Calendar"
                  />
                </View>

                <View style={styles.section}>
                  <SectionHeading title="Preferences" variant="uppercase-accent" />
                  <ListItem
                    variant="row"
                    icon="notifications"
                    onPress={() => navigation?.navigate('Notifications')}
                    title="Notifications"
                  />
                  <ListItem
                    variant="row"
                    icon="focusMode"
                    onPress={() => navigation?.navigate('FocusPreferences')}
                    title="Focus preferences"
                  />
                  <ListItem
                    variant="row"
                    icon="appearance"
                    onPress={() => navigation?.navigate('Appearance')}
                    title="Appearance"
                  />
                  <ListItem
                    variant="row"
                    showDivider={false}
                    icon="idea"
                    onPress={handleOpenTipModal}
                    title="Tips & Wisdom"
                  />
                </View>

                <View style={styles.section}>
                  <SectionHeading title="Plan & Billing" variant="uppercase-accent" />
                  <ListItem
                    variant="row"
                    icon="billing"
                    colorTone="purple"
                    title={hasPremiumAccess ? 'Bearing 360' : 'Free Plan'}
                    description={getPlanRenewalDescription()}
                  />
                  <ListItem
                    variant="row"
                    icon="settings"
                    showDivider={hasPremiumAccess && Boolean(authUser) && !isAnonymous}
                    onPress={() => void handlePremiumAction()}
                    title={hasPremiumAccess ? 'Manage Subscription' : 'Upgrade to Bearing 360'}
                    description={
                      premiumManagementPending
                        ? 'Opening...'
                        : (premiumManagementError ?? undefined)
                    }
                    disabled={premiumManagementPending}
                  />
                  {hasPremiumAccess && authUser && !isAnonymous ? (
                    <ListItem
                      variant="row"
                      showDivider={false}
                      onPress={() => setCreditPackVisible(true)}
                      title="AI planning credits"
                      description={
                        aiCreditBalanceLoading
                          ? 'Checking your current balance...'
                          : (aiCreditBalanceError ??
                            (aiCreditBalance === null
                              ? 'Current balance unavailable.'
                              : `${aiCreditBalance} available`))
                      }
                    />
                  ) : null}
                </View>

                <View style={styles.section}>
                  <SectionHeading title="Account Actions" variant="uppercase-accent" />
                  <ListItem
                    variant="row"
                    icon="legal"
                    onPress={() => setLegalDocumentId('privacy')}
                    title="Privacy policy"
                  />
                  <ListItem
                    variant="row"
                    icon="document"
                    onPress={() => setLegalDocumentId('terms')}
                    title="Terms of service"
                  />
                  <ListItem
                    variant="row"
                    icon="support"
                    onPress={() => void handleOpenSupport()}
                    title="Support"
                  />
                  <ListItem
                    variant="row"
                    icon="info"
                    title="Share product diagnostics"
                    description="Sends fixed outcome events only. Bearing excludes account IDs, content, calendar details, locations, and raw errors."
                    trailingContent={
                      <Switch
                        accessibilityLabel="Share product diagnostics"
                        value={telemetryConsent.enabled}
                        disabled={telemetryConsent.pending}
                        onValueChange={(enabled) => void telemetryConsent.updateConsent(enabled)}
                      />
                    }
                  />
                  {legalError ? <Text style={styles.errorText}>{legalError}</Text> : null}
                  <ListItem
                    variant="row"
                    icon="externalLink"
                    onPress={() => setDataExportVisible(true)}
                    title="Export all data"
                  />
                  <ListItem
                    variant="row"
                    showDivider={false}
                    icon="delete"
                    colorTone="danger"
                    onPress={() => setDeleteAccountVisible(true)}
                    title="Delete account"
                  />
                </View>

                <View style={styles.section}>
                  <SectionHeading title="Session" variant="uppercase-accent" />
                  <ListItem
                    variant="row"
                    showDivider={false}
                    icon="logout"
                    colorTone="danger"
                    onPress={onPressSignOut}
                    title="Sign Out"
                    trailingText={isSignOutPending ? 'Working...' : undefined}
                    disabled={isSignOutPending}
                  />
                </View>
              </>
            ) : null}

            {profileSection === 'account' ? (
              <View style={styles.section}>
                <SectionHeading title="Personal Information" variant="uppercase-accent" />
                <ProfileIdentityCard
                  displayName={displayName || profile.displayName}
                  email={email || profile.email}
                />
                <FormField
                  label="Display name"
                  labelStyle={styles.sectionTitle}
                  accessibilityLabel="Profile display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  onBlur={() => void handleDisplayNameBlur()}
                  placeholder="Your name"
                  containerStyle={styles.displayNameField}
                />
                {displayNamePending ? null : displayNameError ? (
                  <Text style={styles.errorText}>{displayNameError}</Text>
                ) : null}
              </View>
            ) : null}

            {profileSection === 'security' ? (
              <View style={styles.section}>
                <SectionHeading title="Security" variant="uppercase-accent" />
                {isAnonymous ? (
                  <View style={styles.sectionBody}>
                    <Text style={styles.sectionTitle}>Secure this anonymous session</Text>
                    <Text style={styles.stateDescription}>
                      Add Google or email and password while keeping this Firebase user ID and its
                      existing app data.
                    </Text>

                    <GoogleAuthButton
                      label="Secure with Google"
                      disabled={!isGoogleAuthReady || linkPending}
                      loading={googleLinkPending}
                      onPress={() => void handleLinkGoogleAccount()}
                    />

                    <Text style={styles.sectionTitle}>Or use email and password</Text>

                    <FormField
                      label="Display name"
                      accessibilityLabel="Secure account display name"
                      value={linkDisplayName}
                      onChangeText={setLinkDisplayName}
                      placeholder="Your name"
                    />

                    <FormField
                      label="Email"
                      accessibilityLabel="Secure account email"
                      value={linkEmail}
                      onChangeText={setLinkEmail}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />

                    <FormField
                      label="Password"
                      accessibilityLabel="Secure account password"
                      value={linkPassword}
                      onChangeText={setLinkPassword}
                      secureTextEntry
                      placeholder="At least 6 characters"
                    />

                    <FormField
                      label="Confirm password"
                      accessibilityLabel="Secure account confirm password"
                      value={linkPasswordConfirm}
                      onChangeText={setLinkPasswordConfirm}
                      secureTextEntry
                      placeholder="Re-enter password"
                    />

                    {linkError ? <Text style={styles.errorText}>{linkError}</Text> : null}

                    <AppButton
                      label="Secure Account"
                      accessibilityLabel="Secure anonymous account"
                      onPress={() => void handleLinkAnonymousAccount()}
                      loading={linkPending}
                      loadingLabel="Securing..."
                    />
                  </View>
                ) : (
                  <View style={styles.sectionBody}>
                    {hasGoogleProvider ? (
                      <ListItem
                        variant="row"
                        showDivider={hasPasswordProvider}
                        onPress={
                          hasPasswordProvider
                            ? () => {
                                setGoogleDisconnectError(null);
                                setDisconnectGoogleVisible(true);
                              }
                            : undefined
                        }
                        title="Google Sign-In"
                        description={
                          hasPasswordProvider
                            ? 'Connected. Disconnecting Google will keep email and password access.'
                            : 'Connected. Add a password before disconnecting Google.'
                        }
                        trailingText={hasPasswordProvider ? 'Disconnect' : 'Connected'}
                      />
                    ) : (
                      <GoogleAuthButton
                        label="Add Google Sign-In"
                        disabled={!isGoogleAuthReady}
                        loading={googleLinkPending}
                        onPress={() => void handleLinkGoogleAccount()}
                      />
                    )}

                    {hasPasswordProvider ? (
                      <ListItem
                        variant="row"
                        showDivider={false}
                        onPress={() => void handleSendPasswordReset()}
                        title="Reset password"
                        description="Send a Firebase reset email to the current account address."
                        trailingText={passwordResetPending ? 'Working...' : 'Send'}
                        disabled={passwordResetPending}
                      />
                    ) : null}

                    {linkError ? <Text style={styles.errorText}>{linkError}</Text> : null}
                  </View>
                )}
              </View>
            ) : null}

            {profileSection === 'notifications' ? (
              <View style={styles.section}>
                <SectionHeading title="Notifications" variant="uppercase-accent" />
                <ListItem
                  variant="row"
                  showDivider={false}
                  onPress={() => setSoundPicker('reminder')}
                  title="Reminder sound"
                  description="Pick the sound used before scheduled events."
                  trailingText={getProfileSoundOption(profile.reminderSoundId).label}
                />
                {soundError ? <Text style={styles.errorText}>{soundError}</Text> : null}
              </View>
            ) : null}

            {profileSection === 'focusPreferences' ? (
              <View style={styles.section}>
                <SectionHeading title="Focus Preferences" variant="uppercase-accent" />
                <ListItem
                  variant="row"
                  showDivider={false}
                  onPress={() => setSoundPicker('alarm')}
                  title="Timer sound"
                  description="Pick the sound used when timer-style alerts finish."
                  trailingText={getProfileSoundOption(profile.alarmSoundId).label}
                />
                {soundError ? <Text style={styles.errorText}>{soundError}</Text> : null}
              </View>
            ) : null}

            {profileSection === 'appearance' ? (
              <View style={styles.section}>
                <SectionHeading title="Appearance" variant="uppercase-accent" />
                <View style={styles.sectionBody}>
                  <ListItem
                    variant="row"
                    title="Theme"
                    trailingContentBelow
                    trailingContent={
                      <SegmentedControl
                        accessibilityLabel="Theme"
                        options={THEME_OPTIONS}
                        value={themePreference}
                        onChange={(nextPreference) =>
                          void handleThemePreferenceChange(nextPreference)
                        }
                      />
                    }
                  />
                  <ListItem
                    variant="row"
                    title="Time format"
                    trailingContentBelow
                    trailingContent={
                      <SegmentedControl
                        accessibilityLabel="Time format"
                        options={TIME_FORMAT_OPTIONS}
                        value={timeFormat}
                        onChange={(nextValue) =>
                          void handleTimeFormatChange(nextValue as TimeFormat)
                        }
                      />
                    }
                  />
                  <ListItem
                    variant="row"
                    title="Time zone"
                    accessibilityLabel="Open timezone picker"
                    onPress={() => setTimezonePickerVisible(true)}
                    disabled={timezonePending}
                    trailingText={
                      timezonePending
                        ? 'Saving...'
                        : (timezoneError ??
                          getProfileSelectionLabel(
                            PROFILE_TIMEZONE_OPTIONS,
                            timezone,
                            timezone || 'Select a time zone',
                          ))
                    }
                  />
                  <ListItem
                    variant="row"
                    showDivider={false}
                    title="Locale"
                    accessibilityLabel="Open locale picker"
                    onPress={() => setLocalePickerVisible(true)}
                    disabled={localePending}
                    trailingText={
                      localePending
                        ? 'Saving...'
                        : (localeError ??
                          getProfileSelectionLabel(
                            PROFILE_LOCALE_OPTIONS,
                            locale,
                            locale || 'Select a locale',
                          ))
                    }
                  />
                </View>
              </View>
            ) : null}

            {profileSection === 'connectedServices' ? (
              <View style={styles.section}>
                <SectionHeading title="Calendars & Data" variant="uppercase-accent" />
                <ListItem
                  variant="row"
                  onPress={() => setDeviceCalendarsModalVisible(true)}
                  title="Device calendars"
                  description={getDeviceCalendarDescription()}
                  trailingText={getDeviceCalendarTrailingText()}
                />
                <ListItem
                  variant="row"
                  onPress={() => setIcsModalVisible(true)}
                  title="Export calendar"
                  description="Export Bearing events to a general .ics file."
                  trailingText="Export"
                />
                <ListItem
                  variant="row"
                  showDivider={false}
                  onPress={() => setDataExportVisible(true)}
                  title="Export all data"
                  description="Download your profile, plan, events, goals, notes, and tasks as JSON."
                  trailingText="Export"
                />
              </View>
            ) : null}

            {profileSection === 'plan' ? (
              <View style={styles.section}>
                <SectionHeading title="Plan" variant="uppercase-accent" />
                <ListItem
                  variant="row"
                  onPress={() => void handlePremiumAction()}
                  title="Bearing 360 access"
                  description={getPremiumAccessDescription()}
                  trailingText={
                    premiumManagementPending
                      ? 'Opening...'
                      : hasPremiumAccess
                        ? 'Manage'
                        : 'View plans'
                  }
                  disabled={premiumManagementPending}
                />
                {hasPremiumAccess && authUser && !isAnonymous ? (
                  <ListItem
                    variant="row"
                    showDivider={false}
                    onPress={() => setCreditPackVisible(true)}
                    title="AI planning credits"
                    description={
                      aiCreditBalanceLoading
                        ? 'Checking your current balance...'
                        : (aiCreditBalanceError ??
                          (aiCreditBalance === null
                            ? 'Current balance unavailable.'
                            : `${aiCreditBalance} available`))
                    }
                    trailingText="Get more"
                  />
                ) : null}
                {premiumManagementError ? (
                  <Text style={styles.errorText}>{premiumManagementError}</Text>
                ) : null}
              </View>
            ) : null}

            {profileSection === 'subscription' ? (
              <View style={styles.section}>
                <SectionHeading title="Subscription" variant="uppercase-accent" />
                <ListItem
                  variant="row"
                  showDivider={false}
                  onPress={() => void handlePremiumAction()}
                  title="Bearing 360 access"
                  description={getPremiumAccessDescription()}
                  trailingText={
                    premiumManagementPending
                      ? 'Opening...'
                      : hasPremiumAccess
                        ? 'Manage'
                        : 'View plans'
                  }
                  disabled={premiumManagementPending}
                />
                {premiumManagementError ? (
                  <Text style={styles.errorText}>{premiumManagementError}</Text>
                ) : null}
              </View>
            ) : null}

            {profileSection === 'legal' ? (
              <View style={styles.section}>
                <SectionHeading title="Privacy & Legal" variant="uppercase-accent" />
                <ListItem
                  variant="row"
                  onPress={() => setLegalDocumentId('privacy')}
                  title="Privacy policy"
                  description="How Bearing handles account, planning, calendar, AI, and diagnostic data."
                  trailingText="Read"
                />
                <ListItem
                  variant="row"
                  onPress={() => setLegalDocumentId('terms')}
                  title="Terms of service"
                  description="Rules for accounts, content, AI, calendars, and future subscriptions."
                  trailingText="Read"
                />
                <ListItem
                  variant="row"
                  showDivider={false}
                  onPress={() => void handleOpenSupport()}
                  title="Support"
                  description="Get help or make a privacy request."
                  trailingText="Email"
                />
                {legalError ? <Text style={styles.errorText}>{legalError}</Text> : null}
                <ListItem
                  variant="row"
                  showDivider={false}
                  title="Share product diagnostics"
                  description="Sends fixed outcome events only. Bearing excludes account IDs, content, calendar details, locations, and raw errors."
                  trailingContent={
                    <Switch
                      accessibilityLabel="Share product diagnostics"
                      value={telemetryConsent.enabled}
                      disabled={telemetryConsent.pending}
                      onValueChange={(enabled) => void telemetryConsent.updateConsent(enabled)}
                    />
                  }
                />
                {telemetryConsent.error ? (
                  <Text style={styles.errorText}>{telemetryConsent.error}</Text>
                ) : null}
              </View>
            ) : null}
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
        visible={timezonePickerVisible}
        title="Time zone"
        searchPlaceholder="Search time zones by city or region"
        selectedValue={timezone}
        options={PROFILE_TIMEZONE_OPTIONS}
        onClose={() => setTimezonePickerVisible(false)}
        onSelect={(value) => void handleSelectTimezone(value)}
      />

      <ProfileSelectionModal
        visible={localePickerVisible}
        title="Locale"
        searchPlaceholder="Search locales by language or region"
        selectedValue={locale}
        options={PROFILE_LOCALE_OPTIONS}
        onClose={() => setLocalePickerVisible(false)}
        onSelect={(value) => void handleSelectLocale(value)}
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
        userId={authUser?.uid ?? null}
        isAnonymous={isAnonymous}
        hasPremiumAccess={hasPremiumAccess}
        onClose={closePremiumPaywall}
      />

      <CreditPackPurchaseModal
        visible={creditPackVisible}
        userId={!isAnonymous ? (authUser?.uid ?? null) : null}
        enabled={hasPremiumAccess && !isAnonymous}
        source="profile"
        currentBalance={aiCreditBalance}
        onBalanceUpdated={(availableCredits) => {
          if (authUser) setAiCreditBalance(authUser.uid, availableCredits);
        }}
        onClose={() => setCreditPackVisible(false)}
      />

      <LegalDocumentModal
        document={legalDocumentId ? LEGAL_DOCUMENTS[legalDocumentId] : null}
        onClose={() => setLegalDocumentId(null)}
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
            <AppButton
              label="Allow Calendar Access"
              variant="secondary"
              accessibilityLabel="Allow device calendar access"
              onPress={() => void runDeviceCalendarAction(deviceCalendars.requestPermission)}
              loading={deviceCalendarPending}
              loadingLabel="Working..."
            />
          ) : null}

          {deviceCalendars.permission === 'blocked' ? (
            <AppButton
              label="Open Settings"
              variant="secondary"
              accessibilityLabel="Open device settings"
              onPress={() => void runDeviceCalendarAction(deviceCalendars.openSettings)}
              loading={deviceCalendarPending}
              loadingLabel="Working..."
            />
          ) : null}

          {deviceCalendars.permission === 'granted' ? (
            <>
              <AppButton
                label="Refresh Calendars"
                variant="secondary"
                accessibilityLabel="Refresh device calendars"
                onPress={() => void runDeviceCalendarAction(deviceCalendars.refresh)}
                loading={deviceCalendarPending}
                loadingLabel="Refreshing..."
              />

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

        <AppButton
          label="Export .ics File"
          variant="secondary"
          accessibilityLabel="Export ics file"
          onPress={() => void handleExportIcs(false)}
          loading={icsPending}
          loadingLabel="Working..."
        />

        <AppButton
          label="Share .ics File"
          variant="secondary"
          accessibilityLabel="Share ics file"
          onPress={() => void handleExportIcs(true)}
          loading={icsPending}
          loadingLabel="Working..."
        />

        {icsError ? <Text style={styles.errorText}>{icsError}</Text> : null}
        {icsFeedback ? <Text style={styles.successText}>{icsFeedback}</Text> : null}
      </AppModal>

      <AppModal
        visible={dataExportVisible}
        title="Account Data Export"
        onClose={() => {
          setDataExportVisible(false);
          setDataExportError(null);
          setDataExportFeedback(null);
        }}
      >
        <Text style={styles.stateDescription}>
          Export all server-held Bearing account data as portable JSON. Device-only calendar data
          remains on this device.
        </Text>
        <AppButton
          label="Export JSON File"
          variant="secondary"
          onPress={() => void handleExportData(false)}
          loading={dataExportPending}
        />
        <AppButton
          label="Share JSON File"
          variant="secondary"
          onPress={() => void handleExportData(true)}
          loading={dataExportPending}
        />
        {dataExportError ? <Text style={styles.errorText}>{dataExportError}</Text> : null}
        {dataExportFeedback ? <Text style={styles.successText}>{dataExportFeedback}</Text> : null}
      </AppModal>

      <AppModal visible={deleteAccountVisible} title="Delete Account" onClose={closeDeleteAccount}>
        <Text style={styles.stateDescription}>
          This permanently deletes your Bearing profile, events, goals, steps, notes, tasks, and
          subscription record. This action cannot be undone.
        </Text>
        {hasPasswordProvider ? (
          <FormField
            label="Current password"
            accessibilityLabel="Account deletion current password"
            value={deletePassword}
            onChangeText={setDeletePassword}
            secureTextEntry
          />
        ) : hasGoogleProvider ? (
          <Text style={styles.stateDescription}>
            Google will ask you to verify this account before permanent deletion begins.
          </Text>
        ) : (
          <Text style={styles.stateDescription}>
            Anonymous sessions can only be deleted while their sign-in is recent. Secure the account
            first if Firebase requires verification.
          </Text>
        )}
        <FormField
          label="Type DELETE to confirm"
          accessibilityLabel="Account deletion confirmation"
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          autoCapitalize="characters"
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Remove linked system calendar copies"
          accessibilityState={{ checked: deleteLinkedCopies }}
          onPress={() => setDeleteLinkedCopies((current) => !current)}
          style={styles.deletionOption}
        >
          <Text style={styles.optionStateText}>{deleteLinkedCopies ? 'Checked' : 'Unchecked'}</Text>
          <Text style={styles.stateDescription}>
            Remove reachable system-calendar copies linked from this device before deletion.
          </Text>
        </Pressable>
        <AppButton
          label="Permanently Delete Account"
          variant="danger"
          onPress={() => void handleDeleteAccount()}
          loading={deletePending}
          loadingLabel="Deleting..."
        />
        {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
      </AppModal>

      <AppModal
        visible={disconnectGoogleVisible}
        title="Disconnect Google Sign-In"
        onClose={closeDisconnectGoogle}
      >
        <Text style={styles.stateDescription}>
          You’ll continue to access this Bearing account with your email and password. Your account
          and data will not be deleted.
        </Text>
        <AppButton
          label="Keep Google Connected"
          variant="secondary"
          onPress={closeDisconnectGoogle}
          disabled={googleDisconnectPending}
        />
        <AppButton
          label="Disconnect Google"
          variant="danger"
          onPress={() => void handleDisconnectGoogle()}
          loading={googleDisconnectPending}
          loadingLabel="Disconnecting..."
        />
        {googleDisconnectError ? (
          <Text style={styles.errorText}>{googleDisconnectError}</Text>
        ) : null}
      </AppModal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: layout.pagePaddingHorizontal,
      paddingVertical: layout.pagePaddingVertical,
      gap: spacing.lg,
      paddingBottom: 120,
    },
    routeHeader: {
      gap: spacing.sm,
    },
    stateTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    stateDescription: {
      ...typography.body,
      color: theme.colors.textPrimary,
      marginTop: spacing.sm,
    },
    section: {
      gap: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    sectionBody: {
      gap: spacing.md,
    },
    sectionContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    appearanceOptions: {
      gap: spacing.lg,
      paddingTop: spacing.md,
    },
    deletionOption: {
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    sectionTitle: {
      ...typography.button,
      color: theme.colors.text,
      letterSpacing: 0,
      textTransform: 'none',
    },
    displayNameField: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    fieldGroup: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    preferenceLabel: {
      ...typography.body,
      color: theme.colors.text,
    },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    selectionButton: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    selectionLabel: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    selectionValue: {
      ...typography.body,
      color: theme.colors.text,
    },
    selectionMeta: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    identitySummary: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    profileHero: {
      alignItems: 'center',
      paddingBottom: spacing.sm,
    },
    profileHeroIdentity: {
      flexDirection: 'column',
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    personalInformationIdentity: {
      paddingTop: spacing.lg,
    },
    identityMark: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.brand,
    },
    identityInitial: {
      ...typography.button,
      color: theme.colors.surface,
    },
    identityCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    profileHeroCopy: {
      flex: 0,
      width: '100%',
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    identityName: {
      ...typography.button,
      color: theme.colors.text,
      textAlign: 'center',
    },
    identityEmail: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    primaryButton: {
      minHeight: 44,
      borderRadius: radii.md,
      backgroundColor: theme.colors.brand,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonText: {
      ...typography.button,
      color: theme.colors.surface,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    dangerActionWrapper: {
      borderRadius: radii.md,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.dangerText,
      overflow: 'hidden',
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    successText: {
      ...typography.helper,
      color: theme.colors.brand,
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
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    secondaryActionButtonText: {
      ...typography.button,
      color: theme.colors.text,
    },
    calendarSelectionRow: {
      minHeight: 44,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    calendarSelectionRowSelected: {
      backgroundColor: theme.colors.surfaceBrand,
    },
    calendarSelectionCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    optionStateText: {
      ...typography.helper,
      color: theme.colors.brand,
      fontWeight: '600',
    },
    disconnectButton: {
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.dangerText,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    disconnectButtonText: {
      ...typography.button,
      color: theme.colors.dangerText,
    },
    tipsButton: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.brand,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    tipsButtonText: {
      ...typography.button,
      color: theme.colors.brand,
    },
  });
