import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GoalsScreen } from '../screens/GoalsScreen';
import { CreateGoalInput, GoalStepRecord, GoalWithSteps } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { useGoalStepEvents } from '../features/goals/useGoalStepEvents';
import { useUserProfile } from '../features/profile/useUserProfile';
import { UserProfileRecord } from '../features/profile/profileTypes';
import { createEvent } from '../services/firebase/firebaseEvents';

jest.mock('../features/goals/useGoals', () => ({
  useGoals: jest.fn(),
}));

jest.mock('../features/goals/useGoalStepEvents', () => ({
  useGoalStepEvents: jest.fn(),
}));

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  createEvent: jest.fn(),
  subscribeToEventsByDateRange: jest.fn(() => jest.fn()),
  subscribeToEventsByStepId: jest.fn(() => jest.fn()),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'test-user' } })),
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
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    ...overrides,
  };
}

function mockUserProfile(overrides: Partial<ReturnType<typeof useUserProfile>> = {}): void {
  const mockedUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;

  mockedUseUserProfile.mockReturnValue({
    authUser: { isAnonymous: false, email: 'preston@example.com' } as never,
    profile: makeProfile(),
    uiState: 'ready',
    error: null,
    isAnonymous: false,
    email: 'preston@example.com',
    updateProfile: jest.fn(async () => undefined),
    sendPasswordReset: jest.fn(async () => undefined),
    linkAnonymousAccount: jest.fn(async () => undefined),
    ...overrides,
  });
}

function makeStep(overrides: Partial<GoalStepRecord> = {}): GoalStepRecord {
  return {
    id: 'step-1',
    userId: 'user-1',
    goalId: 'goal-1',
    title: 'Buy running shoes',
    description: 'Pick a pair that can handle weekly mileage.',
    starter: 'Check two stores',
    estimatedFinishDate: new Date(2026, 6, 25),
    order: 0,
    status: 'pending',
    completedAt: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<GoalWithSteps> = {}): GoalWithSteps {
  const steps = overrides.steps ?? [makeStep()];

  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Run a 10k',
    description: 'Build an eight-week training block.',
    smartMeta: {
      specific: 'Complete a 10k race',
      measurable: 'Finish the race in under 60 minutes',
      achievable: 'Train four times each week',
      relevant: 'Improve overall fitness',
      timeBound: 'By October 1',
    },
    estimatedCompletionDate: new Date(2026, 8, 1),
    nextStepId: steps[0]?.id ?? null,
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    steps,
    nextStep: steps[0] ?? null,
    completedStepCount: 0,
    totalStepCount: steps.length,
    progressText: `0 of ${steps.length} steps completed`,
    ...overrides,
  };
}

function makeOrderedGoal(): GoalWithSteps {
  const firstStep = makeStep();
  const secondStep = makeStep({
    id: 'step-2',
    title: 'Pick a race date',
    description: 'Choose the event to train for.',
    starter: 'Check local race calendars',
    order: 1,
  });

  return makeGoal({
    steps: [firstStep, secondStep],
    nextStep: firstStep,
    nextStepId: firstStep.id,
    totalStepCount: 2,
    progressText: '0 of 2 steps completed',
  });
}

describe('GoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile();
  });

  it('renders the empty state', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    expect(screen.getByText('No goals yet.')).toBeTruthy();
    expect(screen.getByText('New Goal')).toBeTruthy();
  });

  it('renders goal cards with target date and next step', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.getByText('Next task: Buy running shoes')).toBeTruthy();
    expect(screen.getByText('0 of 1 steps completed')).toBeTruthy();
  });

  it('walks the manual goal wizard and saves a goal', async () => {
    let savedGoalInput: CreateGoalInput | null = null;
    const createGoalMock = jest.fn(async (input: CreateGoalInput) => {
      savedGoalInput = input;
    });
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: createGoalMock,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));

    fireEvent.changeText(screen.getByLabelText('Goal name'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Goal description'),
      'Train consistently for eight weeks.',
    );
    expect(screen.getByText('Simple SMART example')).toBeTruthy();
    expect(
      screen.getByText(
        'Good goal: Walk 30 minutes after work, 4 days a week, for the next 6 weeks.',
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('SMART Specific')).toBeNull();
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Open goal target month dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target month 10 - Oct'));
    fireEvent.press(screen.getByLabelText('Open goal target day dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target day 01'));
    fireEvent.press(screen.getByLabelText('Open goal target year dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2026'));
    expect(screen.queryByText('Unlock AI goal builder with Premium.')).toBeNull();
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByText('Unlock AI goal builder with Premium.')).toBeTruthy();
    expect(screen.getByText('View Premium Plans')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Draft step 1 name'), 'Buy running shoes');
    fireEvent.changeText(
      screen.getByLabelText('Draft step 1 description'),
      'Choose a supportive pair.',
    );
    fireEvent.changeText(screen.getByLabelText('Draft step 1 starter'), 'Visit two stores');
    expect(screen.queryByLabelText('Draft step 1 estimated finish date')).toBeNull();
    fireEvent.press(screen.getByLabelText('Open draft step 1 month dropdown'));
    fireEvent.press(screen.getByLabelText('Select draft step 1 month 08 - Aug'));
    fireEvent.press(screen.getByLabelText('Open draft step 1 day dropdown'));
    fireEvent.press(screen.getByLabelText('Select draft step 1 day 05'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save goal'));
    });

    await waitFor(() => {
      expect(createGoalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Run a 10k',
          isAiAssisted: false,
          steps: [
            expect.objectContaining({
              title: 'Buy running shoes',
              starter: 'Visit two stores',
            }),
          ],
        }),
      );

      expect(createGoalMock).toHaveBeenCalledTimes(1);
      expect(savedGoalInput?.steps[0].estimatedFinishDate).toEqual(new Date(2026, 7, 5));
    });
  });

  it('opens the premium paywall from the AI planning step for free users', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal name'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Goal description'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('View premium plans for AI goal builder'));

    expect(screen.getByText('Bearing Premium')).toBeTruthy();
    expect(screen.getByText('Unlock AI goal planning.')).toBeTruthy();
    expect(screen.getByText('Continue on Free Plan')).toBeTruthy();
  });

  it('shows the premium-ready AI message for premium users', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockUserProfile({
      profile: makeProfile({ premiumStatus: 'premium', premiumSource: 'ios' }),
    });

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal name'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Goal description'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.getByText('Premium AI planning slot is ready.')).toBeTruthy();
    expect(screen.queryByLabelText('View premium plans for AI goal builder')).toBeNull();
  });

  it('limits year choices to the present or future and rejects a non-future target date', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 20, 9, 0, 0));

    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal name'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Goal description'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.getByText('Selected date: 07-21-2026')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open goal target year dropdown'));
    expect(screen.queryByText('2025')).toBeNull();
    expect(screen.getByLabelText('Select goal target year 2026')).toBeTruthy();
    expect(screen.getByLabelText('Select goal target year 2076')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Select goal target year 2026'));
    fireEvent.press(screen.getByLabelText('Open goal target month dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target month 07 - Jul'));
    fireEvent.press(screen.getByLabelText('Open goal target day dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target day 20'));
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.getByText('Estimated completion date must be in the future.')).toBeTruthy();

    jest.useRealTimers();
  });

  it('creates a step from goal details, closes the modal stack, and uses the dropdown date picker', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 21, 9, 0, 0));

    const deleteStepMock = jest.fn(async () => undefined);
    const createStepMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: createStepMock,
      deleteStep: deleteStepMock,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByLabelText('Add step'));

    expect(screen.queryByText('Goal Details')).toBeNull();
    expect(screen.queryByLabelText('Step estimated finish date')).toBeNull();
    expect(screen.getByText('Selected date: 07-22-2026')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Step name'), 'Book a training block');
    fireEvent.changeText(
      screen.getByLabelText('Step description'),
      'Pick sessions for the next eight weeks.',
    );
    fireEvent.changeText(screen.getByLabelText('Step starter'), 'Open the calendar');
    fireEvent.press(screen.getByLabelText('Open step target month dropdown'));
    fireEvent.press(screen.getByLabelText('Select step target month 08 - Aug'));
    fireEvent.press(screen.getByLabelText('Open step target day dropdown'));
    fireEvent.press(screen.getByLabelText('Select step target day 12'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save step'));
    });

    await waitFor(() => {
      expect(createStepMock).toHaveBeenCalledWith('goal-1', {
        title: 'Book a training block',
        description: 'Pick sessions for the next eight weeks.',
        starter: 'Open the calendar',
        estimatedFinishDate: new Date(2026, 7, 12),
      });
      expect(screen.getByText('Goal Details')).toBeTruthy();
      expect(screen.queryByLabelText('Save step')).toBeNull();
    });

    jest.useRealTimers();
  });

  it('opens goal details and marks a goal complete from edit mode', async () => {
    const markGoalCompletedMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: markGoalCompletedMock,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByLabelText('Edit goal'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Mark goal complete'));
    });

    await waitFor(() => {
      expect(markGoalCompletedMock).toHaveBeenCalledWith('goal-1');
    });
  });

  it('edits a goal with the wizard-style date picker', async () => {
    const updateGoalMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: updateGoalMock,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByLabelText('Edit goal'));
    expect(screen.queryByLabelText('Edit goal estimated completion date')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open edit goal target month dropdown'));
    fireEvent.press(screen.getByLabelText('Select edit goal target month 10 - Oct'));
    fireEvent.press(screen.getByLabelText('Open edit goal target day dropdown'));
    fireEvent.press(screen.getByLabelText('Select edit goal target day 15'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save goal changes'));
    });

    await waitFor(() => {
      expect(updateGoalMock).toHaveBeenCalledWith('goal-1', {
        title: 'Run a 10k',
        description: 'Build an eight-week training block.',
        estimatedCompletionDate: new Date(2026, 9, 15),
      });
    });
  });

  it('opens step scheduling with a prefilled event title and linked ids', async () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({
      events: [
        {
          ownership: 'bearing',
          id: 'event-1',
          userId: 'user-1',
          title: 'Treadmill session',
          description: '',
          startAt: new Date(2026, 6, 27, 9, 0, 0),
          endAt: new Date(2026, 6, 27, 10, 0, 0),
          timezone: 'UTC',
          allDay: false,
          location: '',
          recurrenceRule: null,
          alarms: [],
          availability: 'busy',
          url: null,
          goalId: 'goal-1',
          stepId: 'step-1',
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      uiState: 'ready',
    });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));
    expect(screen.getByText('Treadmill session')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Schedule event'));

    expect(screen.getByDisplayValue('Buy running shoes')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          title: 'Buy running shoes',
          goalId: 'goal-1',
          stepId: 'step-1',
        }),
      );
    });
  });

  it('moves a step down with the arrow controls', async () => {
    const reorderStepsMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeOrderedGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: reorderStepsMock,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Move Buy running shoes down'));
    });

    await waitFor(() => {
      expect(reorderStepsMock).toHaveBeenCalledWith('goal-1', ['step-2', 'step-1']);
    });
  });

  it('deletes a step from the step edit screen', async () => {
    const deleteStepMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: deleteStepMock,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));
    fireEvent.press(screen.getByLabelText('Edit step'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete step'));
    });

    await waitFor(() => {
      expect(deleteStepMock).toHaveBeenCalledWith('step-1');
      expect(screen.queryByText('Step Details')).toBeNull();
    });
  });

  it('shows no events scheduled when a step has no linked events', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'error' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));

    expect(screen.getByText('No Events Scheduled')).toBeTruthy();
    expect(screen.queryByText('Unable to load linked events.')).toBeNull();
  });

  it('edits a step with the wizard-style date picker', async () => {
    const updateStepMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: updateStepMock,
      reorderSteps: async () => undefined,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));
    fireEvent.press(screen.getByLabelText('Edit step'));
    expect(screen.queryByLabelText('Edit step estimated finish date')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open edit step target month dropdown'));
    fireEvent.press(screen.getByLabelText('Select edit step target month 09 - Sep'));
    fireEvent.press(screen.getByLabelText('Open edit step target day dropdown'));
    fireEvent.press(screen.getByLabelText('Select edit step target day 09'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save step changes'));
    });

    await waitFor(() => {
      expect(updateStepMock).toHaveBeenCalledWith('step-1', {
        title: 'Buy running shoes',
        description: 'Pick a pair that can handle weekly mileage.',
        starter: 'Check two stores',
        estimatedFinishDate: new Date(2026, 8, 9),
      });
    });
  });
});
