import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UseCalendarConnectionsReturn, useCalendarConnections } from '../features/calendar/useCalendarConnections';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useSoundPreview } from '../features/profile/useSoundPreview';
import { useUserProfile } from '../features/profile/useUserProfile';
import { UserProfileRecord } from '../features/profile/profileTypes';

jest.setTimeout(10000);

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../features/calendar/icsFileInterop', () => ({
  buildIcsFilename: jest.fn(() => 'bearing-export-20260726.ics'),
  downloadIcsFileOnWeb: jest.fn(async () => undefined),
  pickIcsFileContent: jest.fn(async () => null),
  shareIcsExportFile: jest.fn(async () => true),
  writeIcsExportFile: jest.fn(async () => 'file:///bearing-export-20260726.ics'),
}));

jest.mock('../features/calendar/icsInterop', () => ({
  parseIcsCalendar: jest.fn(() => ({ events: [], skippedEntries: 0 })),
  serializeEventsToIcs: jest.fn(() => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'),
}));

jest.mock('../features/calendar/useCalendarConnections', () => ({
  useCalendarConnections: jest.fn(),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  createMirroredEvent: jest.fn(async () => 'ics-import-1'),
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

function mockProfileHooks(overrides: {
  userProfile?: Partial<ReturnType<typeof useUserProfile>>;
  soundPreview?: Partial<ReturnType<typeof useSoundPreview>>;
} = {}): {
  updateProfile: jest.Mock;
  sendPasswordReset: jest.Mock;
  linkAnonymousAccount: jest.Mock;
  updateConnectionCalendars: UseCalendarConnectionsReturn['updateConnectionCalendars'];
  updateConnectionSyncEnabled: UseCalendarConnectionsReturn['updateConnectionSyncEnabled'];
  disconnectConnection: UseCalendarConnectionsReturn['disconnectConnection'];
  previewSound: jest.Mock;
  stopPreview: jest.Mock;
} {
  const updateProfile = jest.fn(async () => undefined);
  const sendPasswordReset = jest.fn(async () => undefined);
  const linkAnonymousAccount = jest.fn(async () => undefined);
  const updateConnectionCalendars: UseCalendarConnectionsReturn['updateConnectionCalendars'] =
    jest.fn(async () => undefined);
  const updateConnectionSyncEnabled: UseCalendarConnectionsReturn['updateConnectionSyncEnabled'] =
    jest.fn(async () => undefined);
  const disconnectConnection: UseCalendarConnectionsReturn['disconnectConnection'] =
    jest.fn(async () => undefined);
  const previewSound = jest.fn(async () => undefined);
  const stopPreview = jest.fn(() => undefined);

  const mockedUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
  const mockedUseCalendarConnections =
    useCalendarConnections as jest.MockedFunction<typeof useCalendarConnections>;
  const mockedUseSoundPreview = useSoundPreview as jest.MockedFunction<typeof useSoundPreview>;

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
    ...overrides.userProfile,
  });

  mockedUseCalendarConnections.mockReturnValue({
    connections: [],
    uiState: 'empty',
    updateConnectionCalendars,
    updateConnectionSyncEnabled,
    disconnectConnection,
  });

  mockedUseSoundPreview.mockReturnValue({
    playingSoundId: null,
    previewError: null,
    previewSound,
    stopPreview,
    ...overrides.soundPreview,
  });

  return {
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
    updateConnectionCalendars,
    updateConnectionSyncEnabled,
    disconnectConnection,
    previewSound,
    stopPreview,
  };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockRestore?.();
  });

  it('saves account settings and sends a password reset email', async () => {
    const { updateProfile, sendPasswordReset } = mockProfileHooks();

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

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

  it('shows secured-account messaging for external calendar connections', () => {
    mockProfileHooks({
      userProfile: {
        authUser: { isAnonymous: true, email: null } as never,
        profile: makeProfile({ email: '' }),
        isAnonymous: true,
        email: null,
      },
    });

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

    expect(screen.getAllByText('Secure account first').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Secure your account before connecting external calendars.').length,
    ).toBeGreaterThan(0);
  });

  it('opens a connected calendar modal and updates selected calendars', async () => {
    const { updateConnectionCalendars } = mockProfileHooks();
    const mockedUseCalendarConnections =
      useCalendarConnections as jest.MockedFunction<typeof useCalendarConnections>;

    mockedUseCalendarConnections.mockReturnValue({
      connections: [
        {
          id: 'google-1',
          userId: 'user-1',
          provider: 'google',
          status: 'connected',
          accountLabel: 'preston@example.com',
          syncEnabled: true,
          lastSyncAt: new Date(2026, 6, 26, 9, 30, 0),
          lastSyncStatus: 'ok',
          lastErrorMessage: null,
          createdAt: new Date(2026, 6, 26, 8, 0, 0),
          updatedAt: new Date(2026, 6, 26, 9, 30, 0),
          calendars: [
            {
              id: 'work',
              label: 'Work',
              color: null,
              isPrimary: true,
              isSelected: true,
            },
            {
              id: 'personal',
              label: 'Personal',
              color: null,
              isPrimary: false,
              isSelected: false,
            },
          ],
        },
      ],
      uiState: 'ready',
      updateConnectionCalendars,
      updateConnectionSyncEnabled: jest.fn(async () => undefined),
      disconnectConnection: jest.fn(async () => undefined),
    });

    render(<ProfileScreen onPressSignOut={() => undefined} isSignOutPending={false} />);

    fireEvent.press(screen.getByLabelText('Google Calendar'));

    expect(screen.getByText('Visible calendars')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Select calendar Personal'));
    });

    await waitFor(() => {
      expect(updateConnectionCalendars).toHaveBeenCalledWith('google-1', [
        {
          id: 'work',
          label: 'Work',
          color: null,
          isPrimary: true,
          isSelected: true,
        },
        {
          id: 'personal',
          label: 'Personal',
          color: null,
          isPrimary: false,
          isSelected: true,
        },
      ]);
    });
  });
});