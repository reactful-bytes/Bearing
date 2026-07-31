import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

import {
  UseDeviceCalendarsReturn,
  useDeviceCalendars,
} from '../features/calendar/useDeviceCalendars';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useSoundPreview } from '../features/profile/useSoundPreview';
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
import { cleanupLinkedCalendarCopies } from '../features/profile/accountDeletionService';
import { reauthenticateCurrentUser } from '../services/firebase/firebaseAuthActions';
import {
  deleteCurrentUserAccount,
  exportCurrentUserData,
} from '../services/firebase/firebasePrivacy';

jest.setTimeout(10000);

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
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
  requestPermission: jest.Mock;
  refreshCalendars: jest.Mock;
  toggleCalendar: jest.Mock;
  setDefaultCalendar: jest.Mock;
  openSettings: jest.Mock;
  previewSound: jest.Mock;
  stopPreview: jest.Mock;
} {
  const updateProfile = jest.fn(async () => undefined);
  const sendPasswordReset = jest.fn(async () => undefined);
  const linkAnonymousAccount = jest.fn(async () => undefined);
  const retryProfile = jest.fn();
  const requestPermission = jest.fn(async () => undefined);
  const refreshCalendars = jest.fn(async () => undefined);
  const toggleCalendar = jest.fn(async () => undefined);
  const setDefaultCalendar = jest.fn(async () => undefined);
  const openSettings = jest.fn(async () => undefined);
  const previewSound = jest.fn(async () => undefined);
  const stopPreview = jest.fn(() => undefined);

  const mockedUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
  const mockedUseDeviceCalendars = useDeviceCalendars as jest.MockedFunction<
    typeof useDeviceCalendars
  >;
  const mockedUseSoundPreview = useSoundPreview as jest.MockedFunction<typeof useSoundPreview>;
  const mockedUsePremiumEntitlement = usePremiumEntitlement as jest.MockedFunction<
    typeof usePremiumEntitlement
  >;

  mockedUseUserProfile.mockReturnValue({
    authUser: { isAnonymous: false, email: 'preston@example.com' } as never,
    profile: makeProfile(),
    uiState: 'ready',
    error: null,
    isAnonymous: false,
    email: 'preston@example.com',
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
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

  return {
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
    requestPermission,
    refreshCalendars,
    toggleCalendar,
    setDefaultCalendar,
    openSettings,
    previewSound,
    stopPreview,
  };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockRestore?.();
    (
      cleanupLinkedCalendarCopies as jest.MockedFunction<typeof cleanupLinkedCalendarCopies>
    ).mockResolvedValue({ removedCount: 0, failedCount: 0 });
    (
      reauthenticateCurrentUser as jest.MockedFunction<typeof reauthenticateCurrentUser>
    ).mockResolvedValue();
    (
      deleteCurrentUserAccount as jest.MockedFunction<typeof deleteCurrentUserAccount>
    ).mockResolvedValue();
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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('saves account settings and sends a password reset email', async () => {
    const { updateProfile, sendPasswordReset } = mockProfileHooks();

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

    expect(screen.getByRole('header', { name: 'Account' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Security' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Preferences' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Calendars & Data' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Plan' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Session' })).toBeTruthy();
    expect(screen.getByText('Preston')).toBeTruthy();
    expect(screen.getAllByText('preston@example.com').length).toBeGreaterThan(0);

    fireEvent.changeText(screen.getByLabelText('Profile display name'), 'Preston Bateman');
    fireEvent.press(screen.getByLabelText('Open timezone picker'));
    fireEvent.press(screen.getByLabelText('Select Timezone America/Chicago'));
    fireEvent.press(screen.getByLabelText('Open locale picker'));
    fireEvent.press(screen.getByLabelText('Select Locale en-GB'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save account settings'));
    });

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: 'Preston Bateman',
        timezone: 'America/Chicago',
        locale: 'en-GB',
      });
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Reset password'));
    });

    await waitFor(() => {
      expect(sendPasswordReset).toHaveBeenCalled();
    });
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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

    fireEvent.press(screen.getByLabelText('Tips and wisdom'));
    expect(screen.getByLabelText('Refresh tip')).toBeTruthy();
    expect(screen.getByLabelText('Close tip modal')).toBeTruthy();
    expect(screen.getByText('Bearing Tip')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Refresh tip'));
    expect(screen.getByText('Life Wisdom')).toBeTruthy();

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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Device calendars'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Allow device calendar access'));
    });
    expect(requestPermission).toHaveBeenCalled();
    expect(screen.queryByText('Bearing Premium')).toBeNull();
  });

  it('updates visible and writable default device calendars', async () => {
    const { toggleCalendar, setDefaultCalendar, refreshCalendars } = mockProfileHooks();

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Device calendars'));

    expect(screen.getByText('Visible calendars')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Toggle visible calendar Work'));
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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Export calendar'));
    expect(screen.getByText(/all-day, timezone, recurrence/)).toBeTruthy();

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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Export calendar'));
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
      render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
      fireEvent.press(screen.getByLabelText('Export calendar'));
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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Export all data'));
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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Delete account'));
    fireEvent.changeText(screen.getByLabelText('Account deletion current password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(reauthenticateCurrentUser).toHaveBeenCalledWith('hunter2!');
    expect(cleanupLinkedCalendarCopies).toHaveBeenCalledWith('user-1');
    expect(deleteCurrentUserAccount).toHaveBeenCalled();
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

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);
    fireEvent.press(screen.getByLabelText('Delete account'));
    fireEvent.changeText(screen.getByLabelText('Account deletion current password'), 'hunter2!');
    fireEvent.changeText(screen.getByLabelText('Account deletion confirmation'), 'DELETE');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Permanently Delete Account'));
    });

    expect(screen.getByText(/Could not remove 1 linked system calendar copy/)).toBeTruthy();
    expect(deleteCurrentUserAccount).not.toHaveBeenCalled();
  });
});
