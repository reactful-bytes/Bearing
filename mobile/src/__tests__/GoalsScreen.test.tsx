import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GoalsScreen } from '../screens/GoalsScreen';
import {
  CreateGoalInput,
  GoalMilestoneWithTasks,
  GoalWithMilestones,
} from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { useMilestoneEvents } from '../features/goals/useMilestoneEvents';
import { useUserProfile } from '../features/profile/useUserProfile';
import { UserProfileRecord } from '../features/profile/profileTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { TaskRecord } from '../features/tasks/taskTypes';
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

jest.mock('../features/tasks/useTasks', () => ({
  useTasks: jest.fn(() => ({ createTask: jest.fn(async () => undefined) })),
}));

jest.mock('../features/goals/useMilestoneEvents', () => ({
  useMilestoneEvents: jest.fn(),
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
  subscribeToCalendarEvents: jest.fn(() => jest.fn()),
  subscribeToEventsByMilestoneId: jest.fn(() => jest.fn()),
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

function makeMilestone(overrides: Partial<GoalMilestoneWithTasks> = {}): GoalMilestoneWithTasks {
  return {
    id: 'milestone-1',
    userId: 'user-1',
    goalId: 'goal-1',
    title: 'Buy running shoes',
    description: 'Pick a pair that can handle weekly mileage.',
    estimatedFinishDate: new Date(2026, 6, 25),
    order: 0,
    status: 'pending',
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    manuallyCompletedAt: null,
    tasks: [],
    completedTaskCount: 0,
    totalTaskCount: 0,
    progressPercent: 0,
    progressText: '0 of 0 tasks',
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    userId: 'user-1',
    title: 'Run twice this week',
    description: '',
    starter: '',
    goalId: 'goal-1',
    milestoneId: 'milestone-1',
    dueDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    allDay: false,
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<GoalWithMilestones> = {}): GoalWithMilestones {
  const milestones = overrides.milestones ?? [makeMilestone()];

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
    nextMilestoneId: milestones[0]?.id ?? null,
    manuallyCompletedAt: null,
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    milestones,
    tasks: milestones.flatMap((milestone) => milestone.tasks),
    nextMilestone: milestones[0] ?? null,
    nextTask: milestones[0]?.tasks[0] ?? null,
    completedTaskCount: 0,
    totalTaskCount: milestones.reduce((count, milestone) => count + milestone.totalTaskCount, 0),
    completedMilestoneCount: 0,
    totalMilestoneCount: milestones.length,
    progressText: `0 of ${milestones.length} milestones complete`,
    ...overrides,
  };
}

function makeOrderedGoal(): GoalWithMilestones {
  const firstMilestone = makeMilestone();
  const secondMilestone = makeMilestone({
    id: 'milestone-2',
    title: 'Pick a race date',
    description: 'Choose the event to train for.',
    order: 1,
  });

  return makeGoal({
    milestones: [firstMilestone, secondMilestone],
    nextMilestone: firstMilestone,
    nextMilestoneId: firstMilestone.id,
    totalMilestoneCount: 2,
    progressText: '0 of 2 milestones complete',
  });
}

function mockGoals(overrides: Partial<ReturnType<typeof useGoals>> = {}): void {
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [],
    uiState: 'empty',
    createGoal: async () => undefined,
    updateGoal: async () => undefined,
    setGoalManuallyCompleted: async () => undefined,
    setMilestoneManuallyCompleted: async () => undefined,
    createMilestone: async () => undefined,
    deleteMilestone: async () => undefined,
    updateMilestone: async () => undefined,
    reorderMilestones: async () => undefined,
    retry: jest.fn(),
    ...overrides,
  });
  (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
    events: [],
    uiState: 'idle',
  });
}

function mockEmptyGoals(): void {
  mockGoals();
}

function openAiPlanningStep(): void {
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
    const mockedUseMilestoneEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;
    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'error',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry,
    });
    mockedUseMilestoneEvents.mockReturnValue({ events: [], uiState: 'idle' });

    const navigate = jest.fn();
    render(<GoalsScreen navigation={{ navigate }} />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });
    render(<GoalsScreen />);

    expect(screen.getByText('No active goals.')).toBeTruthy();
    expect(screen.queryByText('New Goal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Current, 0', selected: true })).toBeTruthy();
  });

  it('filters goals with counts, selected state, and filter-specific empty copy', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    const activeGoal = makeGoal();
    const completedGoal = makeGoal({
      id: 'goal-2',
      title: 'Read twelve books',
      status: 'completed',
      completedMilestoneCount: 1,
      progressText: '1 of 1 milestones complete',
    });

    mockedUseGoals.mockReturnValue({
      goals: [activeGoal, completedGoal],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });
    render(<GoalsScreen />);

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.queryByText('Read twelve books')).toBeNull();
    expect(screen.getByRole('button', { name: 'Current, 1', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Completed, 1', selected: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Archived, 0', selected: false })).toBeTruthy();
    expect(screen.getByText('Next milestone: Buy running shoes')).toBeTruthy();
    expect(screen.getByText('0 of 1 milestones complete')).toBeTruthy();
    expect(screen.getByLabelText('Goal progress Run a 10k').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
      text: '0 of 1 milestones complete',
    });

    fireEvent.press(screen.getByRole('button', { name: 'Completed, 1' }));

    expect(screen.getByText('Read twelve books')).toBeTruthy();
    expect(screen.queryByText('Run a 10k')).toBeNull();
    expect(screen.getByRole('button', { name: 'Completed, 1', selected: true })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Archived, 0' }));

    expect(screen.queryByText('Run a 10k')).toBeNull();
    expect(screen.queryByText('Read twelve books')).toBeNull();
  });

  it('shows completed-filter empty copy', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });
    const navigate = jest.fn();

    render(<GoalsScreen navigation={{ navigate }} />);
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
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: createGoalMock,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);

    expect(screen.getByLabelText('Create Goal modal')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByLabelText('Create Goal modal')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByText('Planning context is required for milestones and tasks.')).toBeTruthy();
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
    fireEvent.press(screen.getByLabelText('Select goal target month'));
    fireEvent.press(screen.getByLabelText('Select goal target October'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2026'));
    expect(screen.queryByText('Unlock AI goal builder with Bearing 360.')).toBeNull();
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByText('Unlock AI goal builder with Bearing 360.')).toBeTruthy();
    expect(screen.getByText('View Bearing 360 Plans')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Draft milestone 1 name'), 'Buy running shoes');
    fireEvent.changeText(
      screen.getByLabelText('Draft milestone 1 description'),
      'Choose a supportive pair.',
    );
    fireEvent.changeText(screen.getByLabelText('Milestone 1 task 1 title'), 'Visit running stores');
    fireEvent.changeText(screen.getByLabelText('Milestone 1 task 1 starter'), 'Visit two stores');
    fireEvent.press(screen.getByLabelText('Select draft milestone 1 month'));
    fireEvent.press(screen.getByLabelText('Select draft milestone 1 November'));
    fireEvent.press(screen.getByLabelText('November 5, 2026'));
    fireEvent.press(screen.getByLabelText('Save goal'));
    expect(
      screen.getByText('Milestone 1 must finish on or before the goal target date.'),
    ).toBeTruthy();
    expect(createGoalMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Select draft milestone 1 month'));
    fireEvent.press(screen.getByLabelText('Select draft milestone 1 August'));
    fireEvent.press(screen.getByLabelText('August 5, 2026'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save goal'));
    });

    await waitFor(() => {
      expect(createGoalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Run a 10k',
          isAiAssisted: false,
          milestones: [
            expect.objectContaining({
              title: 'Buy running shoes',
              tasks: [
                expect.objectContaining({
                  title: 'Visit running stores',
                  starter: 'Visit two stores',
                }),
              ],
            }),
          ],
        }),
      );

      expect(createGoalMock).toHaveBeenCalledTimes(1);
      expect(savedGoalInput?.milestones[0].estimatedFinishDate).toEqual(new Date(2026, 7, 5));
      expect(savedGoalInput?.milestones[0].tasks[0].dueDate).toEqual(new Date(2026, 6, 21));
    });
  });

  it('opens the premium paywall from the AI planning step for free users', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });
    const navigate = jest.fn();

    render(<GoalsScreen route={{ params: { createGoal: true } }} navigation={{ navigate }} />);

    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('View Bearing 360 plans for AI goal builder'));

    expect(navigate).toHaveBeenCalledWith('PremiumPaywall', {
      feature: 'ai_goal_builder',
      source: 'ai_goal_builder',
    });
  });

  it('does not own paywall legal documents locally', () => {
    mockEmptyGoals();
    const navigate = jest.fn();

    render(<GoalsScreen route={{ params: { createGoal: true } }} navigation={{ navigate }} />);

    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('View Bearing 360 plans for AI goal builder'));

    expect(navigate).toHaveBeenCalledWith('PremiumPaywall', {
      feature: 'ai_goal_builder',
      source: 'ai_goal_builder',
    });
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

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByText(/AI credits available: 10/)).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    expect(screen.getByRole('progressbar', { name: 'Generating AI goal plan' })).toBeTruthy();
    expect(screen.getByText('Creating your draft...')).toBeTruthy();
    expect(
      screen.getByText('Building milestones and tasks usually takes a few seconds.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Generate AI goal plan' }).props.accessibilityState,
    ).toEqual({ busy: true, disabled: true });
  });

  it('generates an editable AI draft before saving for premium users', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 23, 9, 0, 0));

    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
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
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
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
          targetDate: '2026-08-20',
          tasks: [
            {
              title: 'Choose weekly run times',
              description: 'Reserve three repeatable windows.',
              starter: 'Open the calendar.',
              targetDate: '2026-08-20',
            },
          ],
        },
      ],
      timelineSummary: 'Build consistency before increasing distance.',
      requestId: '123e4567-e89b-42d3-a456-426614174000',
      availableCredits: 9,
    });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);

    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.getByText('Build an editable first draft.')).toBeTruthy();
    expect(screen.getByText('What the AI plans from')).toBeTruthy();
    expect(screen.queryByText('Bearing 360 Enabled')).toBeNull();
    expect(screen.queryByLabelText('View Bearing 360 plans for AI goal builder')).toBeNull();
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
      screen.getByText(/uses 1 AI credit and replaces the current milestones and tasks/i),
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

    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Draft milestone 1 name'), 'Build consistency');
    expect(screen.getByDisplayValue('Choose weekly run times')).toBeTruthy();
    expect(screen.getAllByLabelText('August 24, 2026')).toHaveLength(2);
    fireEvent.changeText(screen.getByLabelText('Milestone 1 task 1 title'), 'Schedule weekly runs');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save goal'));
    });

    await waitFor(() =>
      expect(createGoalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isAiAssisted: true,
          aiPlanVersion: 1,
          milestones: [
            expect.objectContaining({
              title: 'Build consistency',
              estimatedFinishDate: new Date(2026, 7, 24),
              tasks: [expect.objectContaining({ title: 'Schedule weekly runs' })],
            }),
          ],
        }),
      ),
    );
  });

  it('keeps manual planning available when AI generation fails', async () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
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
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
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
    expect(screen.getByLabelText('Draft milestone 1 name')).toBeTruthy();
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
    });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();

    await waitFor(() => expect(screen.getByText(/AI credits available: 0/)).toBeTruthy());
    expect(screen.getByLabelText('Generate AI goal plan').props.accessibilityState.disabled).toBe(
      true,
    );
    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.getByLabelText('Draft milestone 1 name')).toBeTruthy();
  });

  it('refreshes the balance and explains backend credit exhaustion', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>)
      .mockResolvedValueOnce({ eligible: true, availableCredits: 1 })
      .mockResolvedValueOnce({ eligible: true, availableCredits: 0 });
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockRejectedValue({ code: 'functions/resource-exhausted' });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByText(/AI credits available: 1/)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'No AI planning credits remain. Continue manually or get more AI credits.',
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

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByText(/AI credits available: 10/)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    await waitFor(() =>
      expect(
        screen.getByText('AI planning is already in progress. Try again shortly.'),
      ).toBeTruthy(),
    );
  });

  it('limits year choices to the present or future and allows a target date of today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 20, 9, 0, 0));

    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);

    fireEvent.press(screen.getByLabelText('Continue'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.getByLabelText('July 21, 2026').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByLabelText('Select goal target year'));
    expect(screen.queryByText('2025')).toBeNull();
    expect(screen.getByLabelText('Select goal target year 2026')).toBeTruthy();
    expect(screen.getByLabelText('Select goal target year 2037')).toBeTruthy();
    expect(screen.queryByLabelText('Select goal target year 2038')).toBeNull();

    fireEvent.press(screen.getByLabelText('Select goal target year 2026'));
    fireEvent.press(screen.getByLabelText('Select goal target month'));
    fireEvent.press(screen.getByLabelText('Select goal target July'));
    fireEvent.press(screen.getByLabelText('July 20, 2026'));
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(screen.queryByText('Estimated completion date must be today or later.')).toBeNull();
    expect(screen.getByText('Step 4 of 5: AI Planning')).toBeTruthy();

    jest.useRealTimers();
  });

  it('creates a milestone from goal details and closes the modal stack', async () => {
    const createMilestoneMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: createMilestoneMock,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByLabelText('Add milestone'));

    expect(screen.queryByText('Goal Details')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Milestone name'), 'Book a training block');
    fireEvent.changeText(
      screen.getByLabelText('Milestone description'),
      'Pick sessions for the next eight weeks.',
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone'));
    });

    await waitFor(() => {
      expect(createMilestoneMock).toHaveBeenCalledWith('goal-1', {
        title: 'Book a training block',
        description: 'Pick sessions for the next eight weeks.',
      });
      expect(screen.getByText('Goal Details')).toBeTruthy();
      expect(screen.queryByLabelText('Save milestone')).toBeNull();
    });
  });

  it('allows manually completing a milestone independently of its task progress', async () => {
    const setMilestoneManuallyCompleted = jest.fn(async () => undefined);
    const milestone = makeMilestone();
    mockGoals({
      goals: [makeGoal({ milestones: [milestone] })],
      uiState: 'ready',
      setMilestoneManuallyCompleted,
    });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByLabelText('Open goal Run a 10k'));
    expect(screen.getByText('Not started · 0 of 0 tasks')).toBeTruthy();
    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Mark Done milestone Buy running shoes' }),
      );
    });

    expect(setMilestoneManuallyCompleted).toHaveBeenCalledWith('milestone-1', true);
  });

  it('requires a new task before reopening a manually completed milestone with all tasks done', () => {
    const completedMilestone = makeMilestone({
      status: 'completed',
      manuallyCompletedAt: new Date(2026, 6, 20),
      tasks: [makeTask({ status: 'completed' })],
      completedTaskCount: 1,
      totalTaskCount: 1,
      progressPercent: 100,
      progressText: '1 of 1 tasks',
    });
    mockGoals({
      goals: [makeGoal({ milestones: [completedMilestone] })],
      uiState: 'ready',
    });

    render(<GoalsScreen />);
    fireEvent.press(screen.getByLabelText('Open goal Run a 10k'));
    fireEvent.press(screen.getByLabelText('Open milestone Buy running shoes'));

    expect(
      screen.getByText(
        'All linked tasks are complete. Add a new task before reopening this milestone.',
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Reopen milestone')).toBeNull();
  });

  it('opens goal details and marks a goal complete from edit mode', async () => {
    const markGoalCompletedMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [
        makeGoal({
          milestones: [
            makeMilestone({
              title: 'Build a running base',
              description: 'Establish a consistent weekly rhythm.',
            }),
          ],
        }),
      ],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: markGoalCompletedMock,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    expect(screen.getByRole('button', { name: 'Close Goal Details' })).toBeTruthy();
    expect(screen.queryByLabelText('Dismiss Goal Details')).toBeNull();
    expect(screen.getByText('Milestones')).toBeTruthy();
    expect(screen.getByText('Build a running base')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Edit goal'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Mark goal complete'));
    });

    await waitFor(() => {
      expect(markGoalCompletedMock).toHaveBeenCalledWith('goal-1', true);
    });
  });

  it('edits a goal with the wizard-style date picker', async () => {
    const updateGoalMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: updateGoalMock,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByLabelText('Edit goal'));
    expect(screen.queryByLabelText('Edit goal estimated completion date')).toBeNull();

    fireEvent.press(screen.getByLabelText('Select edit goal target month'));
    fireEvent.press(screen.getByLabelText('Select edit goal target October'));
    fireEvent.press(screen.getByLabelText('October 15, 2026'));

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

  it('opens milestone scheduling with a prefilled event title and linked ids', async () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
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
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
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
          sourceTaskId: null,
          goalId: 'goal-1',
          milestoneId: 'milestone-1',
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

    fireEvent.press(screen.getByLabelText('Schedule milestone event'));

    expect(screen.getByDisplayValue('Buy running shoes')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Buy running shoes',
          goalId: 'goal-1',
          milestoneId: 'milestone-1',
        }),
        { publishToDevice: false },
      );
    });
  });

  it('moves a milestone down with the arrow controls', async () => {
    const reorderMilestonesMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeOrderedGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: reorderMilestonesMock,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Move milestone Buy running shoes down'));
    });

    await waitFor(() => {
      expect(reorderMilestonesMock).toHaveBeenCalledWith('goal-1', ['milestone-2', 'milestone-1']);
    });
  });

  it('deletes a milestone from its details', async () => {
    const deleteMilestoneMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: deleteMilestoneMock,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete milestone'));
    });

    await waitFor(() => {
      expect(deleteMilestoneMock).toHaveBeenCalledWith('milestone-1');
      expect(screen.queryByText('Milestone Details')).toBeNull();
    });
  });

  it('shows no events scheduled when a milestone has no linked events', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'error' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));

    expect(screen.getByText('No events scheduled.')).toBeTruthy();
    expect(screen.queryByText('Unable to load linked events.')).toBeNull();
  });

  it('edits a milestone title and description', async () => {
    const updateMilestoneMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: updateMilestoneMock,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'idle' });

    render(<GoalsScreen />);

    fireEvent.press(screen.getByText('Run a 10k'));
    fireEvent.press(screen.getByText('Buy running shoes'));
    fireEvent.press(screen.getByLabelText('Edit Milestone'));
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Choose a local race');
    fireEvent.changeText(screen.getByLabelText('Edit milestone description'), 'Compare dates.');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save Changes' }));
    });

    await waitFor(() => {
      expect(updateMilestoneMock).toHaveBeenCalledWith('milestone-1', {
        title: 'Choose a local race',
        description: 'Compare dates.',
      });
    });
  });
});
