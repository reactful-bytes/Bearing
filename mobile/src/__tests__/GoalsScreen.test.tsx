import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GoalsScreen } from '../screens/GoalsScreen';
import { CreateGoalInput, GoalStepRecord, GoalWithSteps } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { useGoalStepEvents } from '../features/goals/useGoalStepEvents';
import { useUserProfile } from '../features/profile/useUserProfile';
import { UserProfileRecord } from '../features/profile/profileTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
} from '../services/firebase/firebaseAiGoalPlans';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '123e4567-e89b-42d3-a456-426614174000'),
}));

jest.mock('../features/goals/useGoals', () => ({
  useGoals: jest.fn(),
}));

jest.mock('../features/goals/useGoalStepEvents', () => ({
  useGoalStepEvents: jest.fn(),
}));

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));

jest.mock('../features/premium/usePremiumEntitlement', () => ({
  usePremiumEntitlement: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAiGoalPlans', () => ({
  generateAiGoalPlanDraft: jest.fn(),
  getAiCreditStatus: jest.fn(),
  getAiPlanningErrorCode: jest.fn(
    (error: { code?: string }) => error?.code?.replace('functions/', '') ?? null,
  ),
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
    timeFormat: '12-hour',
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
    hasPasswordProvider: true,
    hasGoogleProvider: false,
    isGoogleAuthReady: true,
    updateProfile: jest.fn(async () => undefined),
    sendPasswordReset: jest.fn(async () => undefined),
    linkAnonymousAccount: jest.fn(async () => undefined),
    linkGoogleAccount: jest.fn(async () => 'linked' as const),
    disconnectGoogleAccount: jest.fn(async () => undefined),
    reauthenticateWithGoogle: jest.fn(async () => 'verified' as const),
    revokeGoogleAccess: jest.fn(async () => undefined),
    retry: jest.fn(),
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

function mockEmptyGoals(): void {
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [],
    uiState: 'empty',
    createGoal: async () => undefined,
    updateGoal: async () => undefined,
    markGoalCompleted: async () => undefined,
    createStep: async () => undefined,
    deleteStep: async () => undefined,
    updateStep: async () => undefined,
    reorderSteps: async () => undefined,
    retry: jest.fn(),
  });
  (useGoalStepEvents as jest.MockedFunction<typeof useGoalStepEvents>).mockReturnValue({
    events: [],
    uiState: 'idle',
  });
}

function openAiPlanningStep(): void {
  fireEvent.press(screen.getByText('New Goal'));
  fireEvent.press(screen.getByLabelText('Continue'));
  fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
  fireEvent.changeText(
    screen.getByLabelText('Planning context'),
    'Build endurance safely with three runs per week over eight weeks.',
  );
  fireEvent.press(screen.getByLabelText('Continue'));
  fireEvent.press(screen.getByLabelText('Continue'));
}

describe('GoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile();
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: null,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockResolvedValue({
      eligible: true,
      availableCredits: 10,
      nextGrantAt: '2027-01-01T00:00:00.000Z',
    });
    (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
      publicationCalendarTitle: null,
      createEvent: jest.fn(async () => 'event-new'),
      publishEvent: jest.fn(async () => undefined),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries after the goals subscriptions fail', () => {
    const retry = jest.fn();
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;
    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'error',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
      retry,
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    expect(screen.getByText('No active goals.')).toBeTruthy();
    expect(screen.getByText('New Goal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Active, 0', selected: true })).toBeTruthy();
  });

  it('filters goals with counts, selected state, and filter-specific empty copy', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    const activeGoal = makeGoal();
    const completedGoal = makeGoal({
      id: 'goal-2',
      title: 'Read twelve books',
      status: 'completed',
      completedStepCount: 1,
      progressText: '1 of 1 steps completed',
    });

    mockedUseGoals.mockReturnValue({
      goals: [activeGoal, completedGoal],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: async () => undefined,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.queryByText('Read twelve books')).toBeNull();
    expect(screen.getByRole('button', { name: 'Active, 1', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Completed, 1', selected: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All, 2', selected: false })).toBeTruthy();
    expect(screen.getByText('Next: Buy running shoes')).toBeTruthy();
    expect(screen.getByText('0 of 1 steps completed')).toBeTruthy();
    expect(screen.getByLabelText('Goal progress Run a 10k').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
      text: '0 of 1 steps completed',
    });

    fireEvent.press(screen.getByRole('button', { name: 'Completed, 1' }));

    expect(screen.getByText('Read twelve books')).toBeTruthy();
    expect(screen.queryByText('Run a 10k')).toBeNull();
    expect(screen.getByRole('button', { name: 'Completed, 1', selected: true })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'All, 2' }));

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.getByText('Read twelve books')).toBeTruthy();
  });

  it('shows completed-filter empty copy', () => {
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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Completed, 0' }));

    expect(screen.getByText('No completed goals.')).toBeTruthy();
    expect(screen.getByText('Goals you finish will stay available here.')).toBeTruthy();
  });

  it('walks the manual goal wizard and saves a goal', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 20));

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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    expect(screen.getByLabelText('Create Goal modal').props.transparent).toBe(false);
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByLabelText('Create Goal modal').props.transparent).toBe(false);

    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByText('Planning context is required for milestones and steps.')).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    expect(screen.getByText('Planning details to include')).toBeTruthy();
    expect(screen.getByText('Objectives: 2-4 concrete results you want.')).toBeTruthy();
    expect(screen.getByText('Success measures: how you will track progress.')).toBeTruthy();
    expect(screen.getByText('Starting point: what is already in place.')).toBeTruthy();
    expect(screen.getByText('Resources: time, tools, or support available.')).toBeTruthy();
    expect(screen.getByText('Constraints: limits or challenges to plan around.')).toBeTruthy();
    expect(
      screen.getByText('Timing: intermediate deadlines and the pace for each outcome.'),
    ).toBeTruthy();
    expect(screen.queryByText('What the AI plans from')).toBeNull();
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
    fireEvent.press(screen.getByLabelText('Select draft step 1 month 11 - Nov'));
    fireEvent.press(screen.getByLabelText('Open draft step 1 day dropdown'));
    fireEvent.press(screen.getByLabelText('Select draft step 1 day 05'));
    fireEvent.press(screen.getByLabelText('Save goal'));
    expect(screen.getByText('Step 1 must finish on or before the goal target date.')).toBeTruthy();
    expect(createGoalMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Open draft step 1 month dropdown'));
    fireEvent.press(screen.getByLabelText('Select draft step 1 month 08 - Aug'));

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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Open goal target year dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('View premium plans for AI goal builder'));

    expect(screen.getByText('Bearing Premium')).toBeTruthy();
    expect(screen.getByText('Unlock AI goal planning.')).toBeTruthy();
    expect(screen.getByText('Continue on Free Plan')).toBeTruthy();
  });

  it('shows clear progress while generating an AI draft', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    mockEmptyGoals();
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockImplementation(() => new Promise(() => undefined));

    render(<GoalsScreen />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByText(/AI credits available: 10/)).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    expect(screen.getByRole('progressbar', { name: 'Generating AI goal plan' })).toBeTruthy();
    expect(screen.getByText('Creating your draft...')).toBeTruthy();
    expect(
      screen.getByText('Building milestones and steps usually takes a few seconds.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Generate AI goal plan' }).props.accessibilityState,
    ).toEqual({ busy: true, disabled: true });
  });

  it('generates an editable AI draft before saving for premium users', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 23, 9, 0, 0));

    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;
    const createGoalMock = jest.fn(async () => undefined);
    const mockedGenerateAiGoalPlanDraft = generateAiGoalPlanDraft as jest.MockedFunction<
      typeof generateAiGoalPlanDraft
    >;

    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });

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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });
    mockedGenerateAiGoalPlanDraft.mockResolvedValue({
      promptVersion: 1,
      smartMeta: {
        specific: 'Finish a 10k race.',
        measurable: 'Run three times each week.',
        achievable: 'Build distance gradually.',
        relevant: 'Improve sustainable fitness.',
        timeBound: 'Finish by the selected target date.',
      },
      milestones: [
        {
          title: 'Build a running base',
          description: 'Establish a consistent weekly rhythm.',
        },
      ],
      steps: [
        {
          title: 'Choose weekly run times',
          description: 'Reserve three repeatable windows.',
          starter: 'Open the calendar.',
          targetDate: '2026-08-20',
        },
      ],
      timelineSummary: 'Build consistency before increasing distance.',
      requestId: '123e4567-e89b-42d3-a456-426614174000',
      availableCredits: 9,
    });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Open goal target year dropdown'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.getByText('Build an editable first draft.')).toBeTruthy();
    expect(screen.getByText('What the AI plans from')).toBeTruthy();
    expect(screen.queryByText('Premium Enabled')).toBeNull();
    expect(screen.queryByLabelText('View premium plans for AI goal builder')).toBeNull();
    await waitFor(() => expect(screen.getByText(/AI credits available: 10/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });

    await waitFor(() => expect(screen.getByText('Review your AI draft.')).toBeTruthy());
    expect(screen.getByText(/AI credits available: 9/)).toBeTruthy();
    expect(mockedGenerateAiGoalPlanDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Run a 10k',
        description: 'Train consistently for eight weeks.',
      }),
    );
    expect(
      screen.getByText(/clarify the goal outcome, objectives, constraints, or timing/i),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Regenerate AI goal plan'));
    expect(screen.getByText('Regenerate AI Draft?')).toBeTruthy();
    expect(
      screen.getByText(/uses 1 AI credit and replaces the current milestones and steps/i),
    ).toBeTruthy();
    expect(mockedGenerateAiGoalPlanDraft).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Cancel AI goal plan regeneration'));
    expect(screen.queryByText('Regenerate AI Draft?')).toBeNull();
    expect(mockedGenerateAiGoalPlanDraft).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Regenerate AI goal plan'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm AI goal plan regeneration'));
    });
    await waitFor(() => expect(mockedGenerateAiGoalPlanDraft).toHaveBeenCalledTimes(2));

    fireEvent.changeText(screen.getByLabelText('AI milestone 1 name'), 'Build consistency');
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByDisplayValue('Choose weekly run times')).toBeTruthy();
    expect(screen.getByText('Selected date: 08-24-2026')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Draft step 1 name'), 'Schedule weekly runs');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save goal'));
    });

    await waitFor(() =>
      expect(createGoalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isAiAssisted: true,
          aiPlanVersion: 1,
          aiMilestones: [
            expect.objectContaining({
              title: 'Build consistency',
            }),
          ],
          steps: [
            expect.objectContaining({
              title: 'Schedule weekly runs',
              estimatedFinishDate: new Date(2026, 7, 24),
            }),
          ],
        }),
      ),
    );
  });

  it('keeps manual planning available when AI generation fails', async () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useGoalStepEvents as jest.MockedFunction<
      typeof useGoalStepEvents
    >;

    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'in_grace_period' } as never,
      uiState: 'ready',
      error: null,
    });
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockRejectedValue(new Error('unavailable'));
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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);
    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Build endurance safely with three runs per week over eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Continue'));

    await waitFor(() => expect(screen.getByText(/AI credits available: 10/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });

    await waitFor(() =>
      expect(
        screen.getByText('AI planning is unavailable right now. Try again or continue manually.'),
      ).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });
    const generationCalls = (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mock.calls;
    expect(generationCalls[0][0].requestId).toBe(generationCalls[1][0].requestId);
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByLabelText('Draft step 1 name')).toBeTruthy();
  });

  it('disables AI generation at zero credits without blocking manual planning', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockResolvedValue({
      eligible: true,
      availableCredits: 0,
      nextGrantAt: '2027-01-01T00:00:00.000Z',
    });
    mockEmptyGoals();

    render(<GoalsScreen />);
    openAiPlanningStep();

    await waitFor(() => expect(screen.getByText(/AI credits available: 0/)).toBeTruthy());
    expect(screen.getByLabelText('Generate AI goal plan').props.accessibilityState.disabled).toBe(
      true,
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByLabelText('Draft step 1 name')).toBeTruthy();
  });

  it('refreshes the balance and explains backend credit exhaustion', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>)
      .mockResolvedValueOnce({ eligible: true, availableCredits: 1, nextGrantAt: null })
      .mockResolvedValueOnce({ eligible: true, availableCredits: 0, nextGrantAt: null });
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockRejectedValue({ code: 'functions/resource-exhausted' });
    mockEmptyGoals();

    render(<GoalsScreen />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByText(/AI credits available: 1/)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'No AI planning credits remain. Continue manually or wait for your next grant.',
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/AI credits available: 0/)).toBeTruthy();
  });

  it('shows a specific message when another generation is active', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockRejectedValue({ code: 'functions/aborted' });
    mockEmptyGoals();

    render(<GoalsScreen />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByText(/AI credits available: 10/)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    await waitFor(() =>
      expect(
        screen.getByText('AI planning is already in progress. Try again shortly.'),
      ).toBeTruthy(),
    );
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
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('New Goal'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
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
      retry: jest.fn(),
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
      goals: [
        makeGoal({
          aiMilestones: [
            {
              title: 'Build a running base',
              description: 'Establish a consistent weekly rhythm.',
            },
          ],
        }),
      ],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      markGoalCompleted: markGoalCompletedMock,
      createStep: async () => undefined,
      deleteStep: async () => undefined,
      updateStep: async () => undefined,
      reorderSteps: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    expect(screen.getByText('Milestones')).toBeTruthy();
    expect(screen.getByText('Build a running base')).toBeTruthy();
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
      retry: jest.fn(),
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
    const createEvent = jest.fn(async () => 'event-new');
    (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
      publicationCalendarTitle: 'Work',
      createEvent,
      publishEvent: jest.fn(async () => undefined),
    });

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
      retry: jest.fn(),
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
        expect.objectContaining({
          title: 'Buy running shoes',
          goalId: 'goal-1',
          stepId: 'step-1',
        }),
        { publishToDevice: false },
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
      retry: jest.fn(),
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
      retry: jest.fn(),
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
      retry: jest.fn(),
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
      retry: jest.fn(),
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
