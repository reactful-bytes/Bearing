import { cloneElement, ReactElement } from 'react';
import {
  act,
  fireEvent,
  render as renderNative,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Linking, Platform } from 'react-native';

import {
  UseDeviceCalendarsReturn,
  useDeviceCalendars,
} from '../features/calendar/useDeviceCalendars';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useSoundPreview } from '../features/profile/useSoundPreview';
import { useTelemetryConsent } from '../features/profile/useTelemetryConsent';
import { useUserProfile } from '../features/profile/useUserProfile';
import { UserProfileRecord } from '../features/profile/profileTypes';
import {
  downloadIcsFileOnWeb,
  shareIcsExportFile,
  writeIcsExportFile,
} from '../features/calendar/icsFileInterop';
import { serializeEventsToIcs } from '../features/calendar/icsInterop';
import { CalendarEvent, createUnpublishedMetadata } from '../features/calendar/calendarTypes';
import { listUserEvents } from '../services/firebase/firebaseEvents';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import {
  downloadDataExportOnWeb,
  shareDataExportFile,
  writeDataExportFile,
} from '../features/profile/dataExportFileInterop';
import {
  cleanupLinkedCalendarCopies,
  purgeLocalAccountData,
} from '../features/profile/accountDeletionService';
import { reauthenticateCurrentUser } from '../services/firebase/firebaseAuthActions';
import {
  deleteCurrentUserAccount,
  exportCurrentUserData,
} from '../services/firebase/firebasePrivacy';
import { showPremiumSubscriptionManagement } from '../services/purchases/revenueCatClient';
import { getAiCreditStatus } from '../services/firebase/firebaseAiGoalPlans';

function render(ui: ReactElement<{ section?: string; navigation?: unknown }>) {
  if (ui.props.section === undefined && ui.props.navigation === undefined) {
    return renderNative(cloneElement(ui, { navigation: { navigate: jest.fn() } } as never));
  }

  return renderNative(ui);
}

jest.setTimeout(10000);

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../features/profile/useTelemetryConsent', () => ({
  useTelemetryConsent: jest.fn(),
}));

jest.mock('../services/firebase/firebasePrivacy', () => ({
  exportCurrentUserData: jest.fn(),
  deleteCurrentUserAccount: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAuthActions', () => ({
  reauthenticateCurrentUser: jest.fn(),
}));

jest.mock('../features/profile/accountDeletionService', () => ({
  cleanupLinkedCalendarCopies: jest.fn(),
  purgeLocalAccountData: jest.fn(),
}));

jest.mock('../features/profile/dataExportFileInterop', () => ({
  buildDataExportFilename: jest.fn(() => 'bearing-data-20260731.json'),
  serializeDataExport: jest.fn(() => '{"userId":"user-1"}\n'),
  downloadDataExportOnWeb: jest.fn(),
  shareDataExportFile: jest.fn(async () => true),
  writeDataExportFile: jest.fn(async () => 'file:///bearing-data-20260731.json'),
}));

jest.mock('../features/premium/usePremiumEntitlement', () => ({
  usePremiumEntitlement: jest.fn(),
}));

jest.mock('../services/purchases/revenueCatClient', () => ({
  getPremiumPurchaseAvailability: jest.fn(() => 'web'),
  showPremiumSubscriptionManagement: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAiGoalPlans', () => ({
  getAiCreditStatus: jest.fn(),
}));

jest.mock('../features/calendar/icsFileInterop', () => ({
  buildIcsFilename: jest.fn(() => 'bearing-export-20260726.ics'),
  downloadIcsFileOnWeb: jest.fn(async () => undefined),
  shareIcsExportFile: jest.fn(async () => true),
  writeIcsExportFile: jest.fn(async () => 'file:///bearing-export-20260726.ics'),
}));

jest.mock('../features/calendar/icsInterop', () => ({
  serializeEventsToIcs: jest.fn(() => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'),
}));

jest.mock('../features/calendar/useDeviceCalendars', () => ({
  useDeviceCalendars: jest.fn(),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  listUserEvents: jest.fn(async () => []),
}));

jest.mock('../features/profile/useSoundPreview', () => ({
  useSoundPreview: jest.fn(),
}));

function makeProfile(overrides: Partial<UserProfileRecord> = {}): UserProfileRecord {
  return {
    userId: 'user-1',
    displayName: 'Preston',
    email: 'preston@example.com',
    timezone: 'America/New_York',
    locale: 'en-US',
    timeFormat: '12-hour',
    premiumStatus: 'free',
    premiumSource: 'none',
    tipsEnabled: true,
    reminderSoundId: 'signal-pulse',
    alarmSoundId: 'summit-chime',
    createdAt: new Date(2026, 6, 22, 10, 0, 0),
    updatedAt: new Date(2026, 6, 22, 10, 0, 0),
    ...overrides,
  };
}

function makeCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const startAt = new Date('2026-07-31T13:00:00.000Z');
  return {
    ownership: 'bearing',
    id: 'event-1',
    userId: 'user-1',
    title: 'Planning',
    description: '',
    startAt,
    endAt: new Date('2026-07-31T14:00:00.000Z'),
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
    ...overrides,
  };
}

function mockProfileHooks(
  overrides: {
    userProfile?: Partial<ReturnType<typeof useUserProfile>>;
    soundPreview?: Partial<ReturnType<typeof useSoundPreview>>;
    deviceCalendars?: Partial<UseDeviceCalendarsReturn>;
  } = {},
): {
  updateProfile: jest.Mock;
  sendPasswordReset: jest.Mock;
  linkAnonymousAccount: jest.Mock;
  linkGoogleAccount: jest.Mock;
  disconnectGoogleAccount: jest.Mock;
  reauthenticateWithGoogle: jest.Mock;
  revokeGoogleAccess: jest.Mock;
  requestPermission: jest.Mock;
  refreshCalendars: jest.Mock;
  toggleCalendar: jest.Mock;
  setDefaultCalendar: jest.Mock;
  openSettings: jest.Mock;
  previewSound: jest.Mock;
  stopPreview: jest.Mock;
  updateTelemetryConsent: jest.Mock;
} {
  const updateProfile = jest.fn(async () => undefined);
  const sendPasswordReset = jest.fn(async () => undefined);
  const linkAnonymousAccount = jest.fn(async () => undefined);
  const linkGoogleAccount = jest.fn(async () => 'linked' as const);
  const disconnectGoogleAccount = jest.fn(async () => undefined);
  const reauthenticateWithGoogle = jest.fn(async () => 'verified' as const);
  const revokeGoogleAccess = jest.fn(async () => undefined);
  const retryProfile = jest.fn();
  const requestPermission = jest.fn(async () => undefined);
  const refreshCalendars = jest.fn(async () => undefined);
  const toggleCalendar = jest.fn(async () => undefined);
  const setDefaultCalendar = jest.fn(async () => undefined);
  const openSettings = jest.fn(async () => undefined);
  const previewSound = jest.fn(async () => undefined);
  const stopPreview = jest.fn(() => undefined);
  const updateTelemetryConsent = jest.fn(async () => undefined);

  const mockedUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
  const mockedUseDeviceCalendars = useDeviceCalendars as jest.MockedFunction<
    typeof useDeviceCalendars
  >;
  const mockedUseSoundPreview = useSoundPreview as jest.MockedFunction<typeof useSoundPreview>;
  const mockedUsePremiumEntitlement = usePremiumEntitlement as jest.MockedFunction<
    typeof usePremiumEntitlement
  >;
  const mockedUseTelemetryConsent = useTelemetryConsent as jest.MockedFunction<
    typeof useTelemetryConsent
  >;

  mockedUseUserProfile.mockReturnValue({
    authUser: {
      uid: 'user-1',
      isAnonymous: false,
      email: 'preston@example.com',
      providerData: [{ providerId: 'password' }],
    } as never,
    profile: makeProfile(),
    uiState: 'ready',
    error: null,
    isAnonymous: false,
    email: 'preston@example.com',
    hasPasswordProvider: true,
    hasGoogleProvider: false,
    isGoogleAuthReady: true,
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
    linkGoogleAccount,
    disconnectGoogleAccount,
    reauthenticateWithGoogle,
    revokeGoogleAccess,
    retry: retryProfile,
    ...overrides.userProfile,
  });

  mockedUseDeviceCalendars.mockReturnValue({
    calendars: [
      {
        id: 'work',
        title: 'Work',
        color: '#4477aa',
        sourceLabel: 'Device account',
        isVisible: true,
        isPrimary: true,
        isSynced: true,
        accessLevel: 'owner',
        allowsModifications: true,
      },
    ],
    permission: 'granted',
    selectedCalendarIds: ['work'],
    defaultCalendarId: null,
    uiState: 'ready',
    error: null,
    staleSelectionRecovered: false,
    requestPermission,
    refresh: refreshCalendars,
    toggleCalendar,
    setDefaultCalendar,
    openSettings,
    ...overrides.deviceCalendars,
  });

  mockedUseSoundPreview.mockReturnValue({
    playingSoundId: null,
    previewError: null,
    previewSound,
    stopPreview,
    ...overrides.soundPreview,
  });

  mockedUsePremiumEntitlement.mockReturnValue({
    entitlement: null,
    uiState: 'ready',
    error: null,
  });

  mockedUseTelemetryConsent.mockReturnValue({
    enabled: false,
    pending: false,
    error: null,
    updateConsent: updateTelemetryConsent,
  });

  return {
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
    linkGoogleAccount,
    disconnectGoogleAccount,
    reauthenticateWithGoogle,
    revokeGoogleAccess,
    requestPermission,
    refreshCalendars,
    toggleCalendar,
    setDefaultCalendar,
    openSettings,
    previewSound,
    stopPreview,
    updateTelemetryConsent,
  };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockRestore?.();
    (
      cleanupLinkedCalendarCopies as jest.MockedFunction<typeof cleanupLinkedCalendarCopies>
    ).mockResolvedValue({ removedCount: 0, failedCount: 0 });
    (purgeLocalAccountData as jest.MockedFunction<typeof purgeLocalAccountData>).mockResolvedValue({
      failedCount: 0,
    });
    (
      reauthenticateCurrentUser as jest.MockedFunction<typeof reauthenticateCurrentUser>
    ).mockResolvedValue();
    (
      deleteCurrentUserAccount as jest.MockedFunction<typeof deleteCurrentUserAccount>
    ).mockResolvedValue();
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockResolvedValue({
      eligible: true,
      availableCredits: 7,
    });
  });

  it('retries after the profile subscription fails', () => {
    const retry = jest.fn();
    mockProfileHooks({
      userProfile: {
        profile: null,
        uiState: 'error',
        error: new Error('Network unavailable.'),
        retry,
      },
    });
    jest
      .mocked(showPremiumSubscriptionManagement)
      .mockRejectedValueOnce(new Error('Store subscription route unavailable.'));

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders a focused profile section with a route back action', () => {
    mockProfileHooks();
    const onPressBack = jest.fn();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="account"
        onPressBack={onPressBack}
      />,
    );

    expect(screen.getByRole('header', { name: 'Personal Information' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Security' })).toBeNull();

    fireEvent.press(screen.getByLabelText('Back to Profile'));
    expect(onPressBack).toHaveBeenCalledTimes(1);
  });

  it('renders distinct focused preference routes and exposes them from the hub', () => {
    mockProfileHooks();
    const navigate = jest.fn();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        navigation={{ navigate }}
      />,
    );

    fireEvent.press(screen.getByLabelText('Notifications'));
    fireEvent.press(screen.getByLabelText('Focus preferences'));
    fireEvent.press(screen.getAllByRole('button', { name: 'Appearance' })[0]);

    expect(navigate).toHaveBeenNthCalledWith(1, 'Notifications');
    expect(navigate).toHaveBeenNthCalledWith(2, 'FocusPreferences');
    expect(navigate).toHaveBeenNthCalledWith(3, 'Appearance');
  });

  it.each([
    ['notifications', 'Notifications', 'Reminder sound'],
    ['focusPreferences', 'Focus Preferences', 'Timer sound'],
    ['appearance', 'Appearance', 'Theme'],
  ] as [
    'notifications' | 'focusPreferences' | 'appearance',
    'Notifications' | 'Focus Preferences' | 'Appearance',
    'Reminder sound' | 'Timer sound' | 'Theme',
  ][])('renders the %s route as a focused section', (section, heading, controlLabel) => {
    mockProfileHooks();

    render(
      <ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} section={section} />,
    );

    expect(screen.getByRole('header', { name: heading })).toBeTruthy();
    expect(screen.getByLabelText(controlLabel)).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Preferences' })).toBeNull();
  });

  it('updates the timezone from the Appearance route', async () => {
    const { updateProfile } = mockProfileHooks();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="appearance"
      />,
    );

    fireEvent.press(screen.getByLabelText('Open timezone picker'));
    expect(screen.getByRole('header', { name: 'Time zone' })).toBeTruthy();
    expect(screen.getByLabelText('Select Time zone America/Chicago')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Select Time zone America/Chicago'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ timezone: 'America/Chicago' });
    });
  });

  it('opens the locale picker from the Appearance route', () => {
    mockProfileHooks();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="appearance"
      />,
    );

    fireEvent.press(screen.getByLabelText('Open locale picker'));

    expect(screen.getByRole('header', { name: 'Locale' })).toBeTruthy();
    expect(screen.getByLabelText('Select Locale en-US')).toBeTruthy();
  });

  it('renders Personal Information as a focused route', () => {
    mockProfileHooks();

    render(
      <ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} section="account" />,
    );

    expect(screen.getByRole('header', { name: 'Personal Information' })).toBeTruthy();
    expect(screen.getByLabelText('Profile display name')).toBeTruthy();
    expect(screen.getByText('Preston')).toBeTruthy();
    expect(screen.getByText('preston@example.com')).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Security' })).toBeNull();
  });

  it('automatically saves the display name when the field loses focus', async () => {
    const { updateProfile } = mockProfileHooks();

    render(
      <ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} section="account" />,
    );

    fireEvent.changeText(screen.getByLabelText('Profile display name'), 'Updated name');
    fireEvent(screen.getByLabelText('Profile display name'), 'blur');

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ displayName: 'Updated name' });
    });
  });

  it('lets the user opt into product diagnostics', () => {
    const { updateTelemetryConsent } = mockProfileHooks();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        navigation={{ navigate: jest.fn() }}
      />,
    );
    fireEvent(screen.getByLabelText('Share product diagnostics'), 'valueChange', true);

    expect(updateTelemetryConsent).toHaveBeenCalledWith(true);
  });

  it('shows subscription-management errors from the profile hub', async () => {
    mockProfileHooks();
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: {
        userId: 'user-1',
        platform: 'web',
        productId: 'bearing_premium_monthly',
        status: 'active',
        periodStartAt: null,
        periodEndAt: null,
        autoRenew: true,
        lastValidatedAt: null,
        createdAt: null,
        updatedAt: null,
      },
      uiState: 'ready',
      error: null,
    });
    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    await act(async () => {
      fireEvent.press(screen.getByText('Manage Subscription'));
    });

    expect(
      screen.getByText('Unable to open the store subscription settings for this account.'),
    ).toBeTruthy();
    expect(showPremiumSubscriptionManagement).toHaveBeenCalledWith('user-1', 'web');
  });

  it('shows the authoritative balance and credit-pack guidance from the profile hub', async () => {
    mockProfileHooks();
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

    await waitFor(() => expect(screen.getByText('7 available')).toBeTruthy());
    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="aiCredits"
        onPressBack={() => undefined}
      />,
    );
    expect(screen.getByText('Keep your planning momentum')).toBeTruthy();
    expect(
      screen.getByText('AI credit packs are available in the iOS and Android apps.'),
    ).toBeTruthy();
  });

  it('explains that RevenueCat Test Store purchases cannot be managed from the profile hub', async () => {
    mockProfileHooks();
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: {
        userId: 'user-1',
        platform: 'android',
        revenueCatStore: 'test_store',
        productId: 'rc_monthly',
        status: 'active',
        periodStartAt: null,
        periodEndAt: null,
        autoRenew: true,
        lastValidatedAt: null,
        createdAt: null,
        updatedAt: null,
      },
      uiState: 'ready',
      error: null,
    });

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    await act(async () => {
      fireEvent.press(screen.getByText('Manage Subscription'));
    });

    expect(
      screen.getByText(
        'Subscription management is unavailable for RevenueCat Test Store purchases. Test Store access expires automatically.',
      ),
    ).toBeTruthy();
    expect(showPremiumSubscriptionManagement).not.toHaveBeenCalled();
  });

  it('opens canonical legal document routes and reports an unconfigured support contact', () => {
    mockProfileHooks();
    const navigate = jest.fn();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        navigation={{ navigate }}
      />,
    );
    fireEvent.press(screen.getByText('Privacy policy'));
    expect(navigate).toHaveBeenCalledWith('LegalDocument', { documentId: 'privacy' });

    fireEvent.press(screen.getByText('Terms of service'));
    expect(navigate).toHaveBeenCalledWith('LegalDocument', { documentId: 'terms' });
  });

  it('opens configured support email and reports email-app failures', async () => {
    const previousSupportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'help@example.com';
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
    mockProfileHooks();

    const view = render(
      <ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Support'));
    });

    expect(openUrl).toHaveBeenCalledWith(
      'mailto:help@example.com?subject=Bearing%20support%20request',
    );

    openUrl.mockRejectedValueOnce(new Error('No email app'));
    view.rerender(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Support'));
    });

    expect(screen.getByText('Unable to open email. Contact help@example.com.')).toBeTruthy();
    openUrl.mockRestore();
    if (previousSupportEmail === undefined) delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    else process.env.EXPO_PUBLIC_SUPPORT_EMAIL = previousSupportEmail;
  });

  it('preserves the session sign-out action', () => {
    const handleSignOut = jest.fn(() => undefined);
    mockProfileHooks();

    render(<ProfileScreen onPressSignOut={handleSignOut} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Sign Out'));

    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });

  it('opens the tips modal, refreshes the tip, and updates sound selections with preview', async () => {
    const { previewSound, updateProfile } = mockProfileHooks();
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.7);

    const view = render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="tipsWisdom"
        onPressBack={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Refresh tip')).toBeTruthy();
    expect(screen.getByLabelText('Back to Profile')).toBeTruthy();
    expect(screen.getByText('Bearing Tip')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Refresh tip'));
    expect(screen.getByText('Life Wisdom')).toBeTruthy();

    view.rerender(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="focusPreferences"
      />,
    );
    fireEvent.press(screen.getByLabelText('Timer sound'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Preview sound Summit Chime'));
    });

    await waitFor(() => {
      expect(previewSound).toHaveBeenCalledWith('summit-chime');
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Select sound Dawn Glow'));
    });

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ alarmSoundId: 'dawn-glow' });
    });
  });

  it('secures an anonymous account from the profile screen', async () => {
    const { linkAnonymousAccount } = mockProfileHooks({
      userProfile: {
        authUser: { isAnonymous: true, email: null } as never,
        profile: makeProfile({ email: '' }),
        isAnonymous: true,
        email: null,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="security"
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Secure account display name'), 'Preston');
    fireEvent.changeText(screen.getByLabelText('Secure account email'), 'preston@example.com');
    fireEvent.changeText(screen.getByLabelText('Secure account password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Secure account confirm password'), 'hunter2!');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Secure anonymous account'));
    });

    await waitFor(() => {
      expect(linkAnonymousAccount).toHaveBeenCalledWith({
        displayName: 'Preston',
        email: 'preston@example.com',
        password: 'hunter2!',
      });
    });
  });

  it('adds Google Sign-In to an existing password account', async () => {
    const { linkGoogleAccount } = mockProfileHooks();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="security"
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add Google Sign-In' }));
    });

    expect(linkGoogleAccount).toHaveBeenCalledTimes(1);
  });

  it('confirms before disconnecting Google from a password account', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { disconnectGoogleAccount } = mockProfileHooks({
      userProfile: {
        authUser: {
          uid: 'user-1',
          isAnonymous: false,
          email: 'preston@example.com',
          providerData: [{ providerId: 'password' }, { providerId: 'google.com' }],
        } as never,
        hasPasswordProvider: true,
        hasGoogleProvider: true,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="security"
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Google Sign-In' }));
    expect(screen.getByText('Disconnect Google Sign-In')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Disconnect Google' }));
    });

    expect(disconnectGoogleAccount).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(
      'Google disconnected',
      'Continue signing in to this Bearing account with your email and password.',
    );
    alert.mockRestore();
  });

  it('does not offer Google disconnection when no password provider remains', () => {
    mockProfileHooks({
      userProfile: {
        authUser: {
          uid: 'user-1',
          isAnonymous: false,
          email: 'preston@example.com',
          providerData: [{ providerId: 'google.com' }],
        } as never,
        hasPasswordProvider: false,
        hasGoogleProvider: true,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="security"
      />,
    );

    expect(screen.getByText(/Add a password before disconnecting Google/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Google Sign-In' })).toBeNull();
  });

  it('offers free device calendar permission to anonymous accounts', async () => {
    const { requestPermission } = mockProfileHooks({
      deviceCalendars: {
        calendars: [],
        permission: 'undetermined',
        selectedCalendarIds: [],
        uiState: 'permission-required',
      },
      userProfile: {
        authUser: { isAnonymous: true, email: null } as never,
        profile: makeProfile({ email: '' }),
        isAnonymous: true,
        email: null,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deviceCalendars"
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Allow device calendar access'));
    });
    expect(requestPermission).toHaveBeenCalled();
    expect(screen.queryByText('Bearing 360')).toBeNull();
  });

  it('updates visible and writable default device calendars', async () => {
    const { toggleCalendar, setDefaultCalendar, refreshCalendars } = mockProfileHooks();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deviceCalendars"
      />,
    );

    expect(screen.getByText('Visible calendars')).toBeTruthy();

    await act(async () => {
      fireEvent(screen.getByLabelText('Toggle visible calendar Work'), 'valueChange', false);
      fireEvent.press(screen.getByLabelText('Use default calendar Work'));
      fireEvent.press(screen.getByLabelText('Refresh device calendars'));
    });

    expect(toggleCalendar).toHaveBeenCalledWith('work');
    expect(setDefaultCalendar).toHaveBeenCalledWith('work');
    expect(refreshCalendars).toHaveBeenCalled();
  });

  it('exports only canonical non-canceled Bearing events to a native ICS file', async () => {
    const scheduledEvent = makeCalendarEvent();
    const canceledEvent = makeCalendarEvent({ id: 'event-2', status: 'canceled' });
    const mockedListUserEvents = listUserEvents as jest.MockedFunction<typeof listUserEvents>;
    const mockedSerialize = serializeEventsToIcs as jest.MockedFunction<
      typeof serializeEventsToIcs
    >;
    const mockedWrite = writeIcsExportFile as jest.MockedFunction<typeof writeIcsExportFile>;
    const mockedShare = shareIcsExportFile as jest.MockedFunction<typeof shareIcsExportFile>;
    mockedListUserEvents.mockResolvedValue([scheduledEvent, canceledEvent]);
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="calendarExport"
      />,
    );
    expect(screen.getByText('Calendar contents')).toBeTruthy();
    expect(screen.getByText('.ics')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Export ics file'));
    });

    expect(mockedListUserEvents).toHaveBeenCalledWith('user-1');
    expect(mockedSerialize).toHaveBeenCalledWith([scheduledEvent]);
    expect(mockedWrite).toHaveBeenCalledWith(
      'bearing-export-20260726.ics',
      'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
    );
    expect(mockedShare).not.toHaveBeenCalled();
    expect(screen.getByText(/Saved bearing-export-20260726.ics/)).toBeTruthy();
  });

  it('writes then opens native sharing for an ICS export', async () => {
    const event = makeCalendarEvent();
    (listUserEvents as jest.MockedFunction<typeof listUserEvents>).mockResolvedValue([event]);
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="calendarExport"
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Share ics file'));
    });

    expect(writeIcsExportFile).toHaveBeenCalled();
    expect(shareIcsExportFile).toHaveBeenCalledWith('file:///bearing-export-20260726.ics');
    expect(screen.getByText('Shared the .ics export.')).toBeTruthy();
  });

  it('downloads directly on development web without writing a native cache file', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    (listUserEvents as jest.MockedFunction<typeof listUserEvents>).mockResolvedValue([
      makeCalendarEvent(),
    ]);
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    try {
      render(
        <ProfileScreen
          onPressSignOut={() => undefined}
          isSignOutPending={false}
          section="calendarExport"
        />,
      );
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Export ics file'));
      });
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }

    expect(downloadIcsFileOnWeb).toHaveBeenCalledWith(
      'bearing-export-20260726.ics',
      'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
    );
    expect(writeIcsExportFile).not.toHaveBeenCalled();
    expect(shareIcsExportFile).not.toHaveBeenCalled();
    expect(screen.getByText('Downloaded bearing-export-20260726.ics.')).toBeTruthy();
  });

  it('exports all account data to a native JSON file', async () => {
    (exportCurrentUserData as jest.MockedFunction<typeof exportCurrentUserData>).mockResolvedValue({
      exportedAt: '2026-07-31T12:00:00.000Z',
      userId: 'user-1',
      profile: null,
      subscription: null,
      events: [],
      goals: [],
      goalSteps: [],
      notes: [],
      tasks: [],
    });
    mockProfileHooks();

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="dataExport"
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Export JSON File'));
    });

    expect(exportCurrentUserData).toHaveBeenCalled();
    expect(writeDataExportFile).toHaveBeenCalledWith(
      'bearing-data-20260731.json',
      '{"userId":"user-1"}\n',
    );
    expect(shareDataExportFile).not.toHaveBeenCalled();
    expect(downloadDataExportOnWeb).not.toHaveBeenCalled();
  });

  it('reauthenticates, removes linked copies, and deletes an email account', async () => {
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    const handleSignOut = jest.fn(() => undefined);
    render(
      <ProfileScreen
        onPressSignOut={handleSignOut}
        isSignOutPending={false}
        section="deleteAccount"
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Account deletion current password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(reauthenticateCurrentUser).toHaveBeenCalledWith('hunter2!');
    expect(cleanupLinkedCalendarCopies).toHaveBeenCalledWith('user-1');
    expect(deleteCurrentUserAccount).toHaveBeenCalled();
    expect(purgeLocalAccountData).toHaveBeenCalledWith('user-1');
    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });

  it('reauthenticates a Google-only account before deletion and revokes native access', async () => {
    const { reauthenticateWithGoogle, revokeGoogleAccess } = mockProfileHooks({
      userProfile: {
        authUser: {
          uid: 'user-1',
          isAnonymous: false,
          email: 'preston@example.com',
          providerData: [{ providerId: 'google.com' }],
        } as never,
        hasPasswordProvider: false,
        hasGoogleProvider: true,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deleteAccount"
      />,
    );
    expect(screen.queryByLabelText('Reset password')).toBeNull();
    expect(screen.queryByLabelText('Account deletion current password')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(reauthenticateWithGoogle).toHaveBeenCalledTimes(1);
    expect(reauthenticateCurrentUser).not.toHaveBeenCalled();
    expect(deleteCurrentUserAccount).toHaveBeenCalledTimes(1);
    expect(revokeGoogleAccess).toHaveBeenCalledTimes(1);
  });

  it('skips linked calendar cleanup when the delete-events switch is off', async () => {
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deleteAccount"
      />,
    );
    fireEvent(screen.getByLabelText('Delete Bearing calendar events'), 'valueChange', false);
    fireEvent.changeText(screen.getByLabelText('Account deletion current password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(cleanupLinkedCalendarCopies).not.toHaveBeenCalled();
    expect(deleteCurrentUserAccount).toHaveBeenCalledTimes(1);
  });

  it('stops Google-only deletion when account verification is cancelled', async () => {
    const reauthenticateWithGoogle = jest.fn(async () => 'cancelled' as const);
    mockProfileHooks({
      userProfile: {
        authUser: {
          uid: 'user-1',
          isAnonymous: false,
          email: 'preston@example.com',
          providerData: [{ providerId: 'google.com' }],
        } as never,
        hasPasswordProvider: false,
        hasGoogleProvider: true,
        reauthenticateWithGoogle,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deleteAccount"
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(
      screen.getByText('Google verification was cancelled. No account data was deleted.'),
    ).toBeTruthy();
    expect(cleanupLinkedCalendarCopies).not.toHaveBeenCalled();
    expect(deleteCurrentUserAccount).not.toHaveBeenCalled();
  });

  it('directs the user to clear app data when local cleanup is incomplete', async () => {
    (purgeLocalAccountData as jest.MockedFunction<typeof purgeLocalAccountData>).mockResolvedValue({
      failedCount: 1,
    });
    const alert = jest.spyOn(Alert, 'alert');
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deleteAccount"
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Account deletion current password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(alert).toHaveBeenCalledWith(
      'Account deleted',
      expect.stringContaining('Clear this app’s local data in device settings'),
    );
    alert.mockRestore();
  });

  it('blocks backend deletion when linked-copy cleanup needs retry', async () => {
    (
      cleanupLinkedCalendarCopies as jest.MockedFunction<typeof cleanupLinkedCalendarCopies>
    ).mockResolvedValue({ removedCount: 0, failedCount: 1 });
    mockProfileHooks({
      userProfile: {
        authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
      },
    });

    render(
      <ProfileScreen
        onPressSignOut={() => undefined}
        isSignOutPending={false}
        section="deleteAccount"
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Account deletion current password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(screen.getByText(/Could not remove 1 linked system calendar copy/)).toBeTruthy();
    expect(deleteCurrentUserAccount).not.toHaveBeenCalled();
  });
});
