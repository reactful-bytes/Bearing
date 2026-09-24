import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { useCreateNote } from '../features/notes/useNotes';
import { useTasks } from '../features/tasks/useTasks';
import { useUserProfile } from '../features/profile/useUserProfile';
import { FocusModeScreen } from '../screens/FocusModeScreen';

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: jest.fn(),
}));
jest.mock('../features/calendar/useCalendarEvents', () => ({
  useCalendarEvents: jest.fn(),
}));
jest.mock('../features/notes/useNotes', () => ({
  useCreateNote: jest.fn(),
}));
jest.mock('../features/tasks/useTasks', () => ({
  useTasks: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));
jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'user-1' } })),
}));
jest.mock('../components/calendar/FocusModeOverlay', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    FocusModeOverlay: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
      visible
        ? ReactModule.createElement(
            View,
            null,
            ReactModule.createElement(Text, null, 'Active Focus'),
            ReactModule.createElement(Pressable, {
              accessibilityRole: 'button',
              accessibilityLabel: 'Complete focus',
              onPress: onClose,
            }),
          )
        : null,
  };
});

const mockUseCalendarEvents = useCalendarEvents as jest.MockedFunction<typeof useCalendarEvents>;
const mockUseCreateNote = useCreateNote as jest.MockedFunction<typeof useCreateNote>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;

function makeEvent(): CalendarDisplayEvent {
  const startAt = new Date('2026-07-28T19:00:00.000Z');
  const endAt = new Date('2026-07-28T19:30:00.000Z');
  return {
    id: 'event-1',
    userId: 'user-1',
    title: 'Write proposal',
    description: 'Focus on the executive summary.',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: null,
    goalId: null,
    taskId: null,
    status: 'scheduled',
    ownership: 'bearing',
    publication: {
      status: 'unpublished',
      markerId: null,
      commonHash: null,
      lastError: null,
      retryable: false,
      deletionIntent: false,
    },
    createdAt: startAt,
    updatedAt: startAt,
  };
}

describe('FocusModeScreen', () => {
  it('shows contextual start state and transitions to a summary after completion', () => {
    const event = makeEvent();
    mockUseCalendarEvents.mockReturnValue({
      events: [event],
      uiState: 'ready',
    } as unknown as ReturnType<typeof useCalendarEvents>);
    mockUseCreateNote.mockReturnValue(jest.fn(async () => undefined));
    mockUseTasks.mockReturnValue({ tasks: [] } as unknown as ReturnType<typeof useTasks>);
    mockUseUserProfile.mockReturnValue({
      profile: { locale: 'en-US', alarmSoundId: 'summit-chime' },
    } as never);

    const goBack = jest.fn();
    render(<FocusModeScreen route={{ params: { eventId: event.id } }} navigation={{ goBack }} />);

    expect(screen.getByText('Focus on')).toBeTruthy();
    expect(screen.getByText('Write proposal')).toBeTruthy();
    expect(screen.getByText(/Ends at/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start Focus Session' }));
    expect(screen.getByText('Active Focus')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Complete focus' }));
    expect(screen.getByTestId('focus-summary-screen')).toBeTruthy();
    expect(screen.getByText('Focus Session Complete')).toBeTruthy();
    expect(screen.getByText('Ideas captured: 0')).toBeTruthy();
  });
});
