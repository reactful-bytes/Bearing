import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { GoalWithSteps } from '../features/goals/goalTypes';
import { NoteRecord } from '../features/notes/noteTypes';
import { UserProfileRecord } from '../features/profile/profileTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { useFocusSession } from '../features/focus/focusSession';
import { useGoals } from '../features/goals/useGoals';
import { useNotes } from '../features/notes/useNotes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { PlanScreen } from '../screens/PlanScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: mockRootNavigate })),
}));

jest.mock('../features/calendar/useCalendarEvents', () => ({
  useCalendarEvents: jest.fn(),
}));
jest.mock('../features/focus/focusSession', () => ({
  useFocusSession: jest.fn(),
}));
jest.mock('../features/goals/useGoals', () => ({
  useGoals: jest.fn(),
}));
jest.mock('../features/notes/useNotes', () => ({
  useNotes: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

const mockUseCalendarEvents = useCalendarEvents as jest.MockedFunction<typeof useCalendarEvents>;
const mockUseFocusSession = useFocusSession as jest.MockedFunction<typeof useFocusSession>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const mockRootNavigate = jest.fn();

function makeProfile(): UserProfileRecord {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeEvent(index: number): CalendarDisplayEvent {
  const startAt = new Date();
  startAt.setMinutes(startAt.getMinutes() + index + 10);
  const endAt = new Date(startAt.getTime() + 30 * 60_000);
  return {
    id: `event-${index}`,
    title: `Plan block ${index}`,
    description: '',
    startAt,
    endAt,
    timezone: 'America/New_York',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    status: 'scheduled',
    ownership: 'bearing',
    userId: 'user-1',
    sourceTaskId: null,
    goalId: null,
    stepId: null,
    publication: {
      status: 'unpublished',
      markerId: null,
      commonHash: null,
      lastError: null,
      retryable: false,
      deletionIntent: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeGoal(): GoalWithSteps {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Ship the next release',
    description: '',
    smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
    estimatedCompletionDate: new Date(2026, 8, 30),
    nextStepId: null,
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    steps: [],
    nextStep: null,
    completedStepCount: 1,
    totalStepCount: 2,
    progressText: '1 of 2 steps completed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeNote(): NoteRecord {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Idea',
    body: 'Try a smaller release.',
    source: 'idea_dump',
    sourceEventId: null,
    sourceStepId: null,
    pinned: false,
    processed: false,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mockReadyState(events: CalendarDisplayEvent[] = [makeEvent(1)]): void {
  mockUseUserProfile.mockReturnValue({ profile: makeProfile() } as ReturnType<
    typeof useUserProfile
  >);
  mockUseCalendarEvents.mockReturnValue({
    events,
    uiState: 'ready',
    refresh: jest.fn(async () => undefined),
  } as unknown as ReturnType<typeof useCalendarEvents>);
  mockUseFocusSession.mockReturnValue(null);
  mockUseGoals.mockReturnValue({
    goals: [makeGoal()],
    uiState: 'ready',
    retry: jest.fn(),
  } as unknown as ReturnType<typeof useGoals>);
  mockUseNotes.mockReturnValue({
    notes: [makeNote()],
    uiState: 'ready',
    retry: jest.fn(),
  } as unknown as ReturnType<typeof useNotes>);
}

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadyState();
  });

  it('composes the live daily command center and limits today events to five', () => {
    mockReadyState(Array.from({ length: 6 }, (_, index) => makeEvent(index)));
    const stackNavigate = jest.fn();

    render(<PlanScreen navigation={{ navigate: stackNavigate } as never} />);

    expect(screen.getByText(/Preston/)).toBeTruthy();
    expect(screen.getByText("Today's plan")).toBeTruthy();
    expect(screen.getByText('Plan block 0')).toBeTruthy();
    expect(screen.getByText('Plan block 4')).toBeTruthy();
    expect(screen.queryByText('Plan block 5')).toBeNull();
    expect(screen.getByText('Ship the next release')).toBeTruthy();
    expect(screen.getByText('1 unprocessed ideas')).toBeTruthy();
  });

  it('routes dashboard actions to the existing typed destinations', () => {
    const stackNavigate = jest.fn();
    render(<PlanScreen navigation={{ navigate: stackNavigate } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'More events' }));
    fireEvent.press(screen.getByRole('button', { name: 'View all' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open Notes' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open profile' }));

    expect(mockRootNavigate).toHaveBeenCalledWith('Calendar');
    expect(stackNavigate).toHaveBeenCalledWith('Goals');
    expect(mockRootNavigate).toHaveBeenCalledWith('Notes', {
      screen: 'NotesHome',
      params: { createNote: true },
    });
    expect(mockRootNavigate).toHaveBeenCalledWith('Profile');
  });

  it('shows the active focus session and opens Focus Mode', () => {
    mockUseFocusSession.mockReturnValue({
      eventId: 'event-1',
      title: 'Plan block 1',
      endAt: new Date(Date.now() + 15 * 60_000),
    });
    const stackNavigate = jest.fn();

    render(<PlanScreen navigation={{ navigate: stackNavigate } as never} />);

    expect(screen.getByText('Focus active: Plan block 1')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open Focus' }));
    expect(mockRootNavigate).toHaveBeenCalledWith('Plan', {
      screen: 'FocusMode',
      params: { eventId: 'event-1' },
    });
  });

  it('renders recovery states for each live Plan source', () => {
    mockUseCalendarEvents.mockReturnValue({
      events: [],
      uiState: 'error',
      refresh: jest.fn(async () => undefined),
    } as unknown as ReturnType<typeof useCalendarEvents>);
    mockUseGoals.mockReturnValue({
      goals: [],
      uiState: 'loading',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useGoals>);
    mockUseNotes.mockReturnValue({
      notes: [],
      uiState: 'empty',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useNotes>);

    render(<PlanScreen navigation={{ navigate: jest.fn() } as never} />);

    expect(screen.getByText("Unable to load today's events.")).toBeTruthy();
    expect(screen.getByText('Loading goals...')).toBeTruthy();
    expect(screen.getByText('0 unprocessed ideas')).toBeTruthy();
  });
});
