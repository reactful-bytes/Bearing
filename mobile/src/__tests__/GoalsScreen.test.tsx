import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { GoalsScreen } from '../screens/GoalsScreen';
import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import {
  EditGoalScreen,
  EditMilestoneScreen,
  MilestoneDetailScreen,
} from '../screens/GoalRouteScreens';
import { closeRowContextMenu } from '../components/ui/RowContextMenu';
import {
  GoalDraftSaveInput,
  GoalDraftSaveResult,
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
import {
  getPremiumPurchaseAvailability,
  loadCreditPacks,
  purchaseCreditPack,
} from '../services/purchases/revenueCatClient';
import { TaskRecord } from '../features/tasks/taskTypes';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
  getAiPlanningErrorDetails,
} from '../services/firebase/firebaseAiGoalPlans';

const mockTaskNavigate = jest.fn();

jest.mock('../services/purchases/revenueCatClient', () => ({
  getPremiumPurchaseAvailability: jest.fn(() => 'web'),
  loadCreditPacks: jest.fn(),
  purchaseCreditPack: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: mockTaskNavigate })),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '123e4567-e89b-42d3-a456-426614174000'),
}));

jest.mock('../features/goals/useGoals', () => ({
  useGoals: jest.fn(),
}));

jest.mock('../features/tasks/useTasks', () => ({
  useTasks: jest.fn(() => ({
    tasks: [],
    createTask: jest.fn(async () => undefined),
    completeTask: jest.fn(async () => undefined),
    reactivateTask: jest.fn(async () => undefined),
    deleteTask: jest.fn(async () => undefined),
  })),
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
  getAiPlanningErrorDetails: jest.fn(() => null),
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
    authUser: { uid: 'user-1', isAnonymous: false, email: 'preston@example.com' } as never,
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
  const tasks = milestones.flatMap((milestone) => milestone.tasks);
  const completedTaskCount = tasks.filter((task) => task.status === 'completed').length;
  const totalTaskCount = tasks.length;

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
    tasks,
    nextMilestone: milestones[0] ?? null,
    nextTask: milestones[0]?.tasks[0] ?? null,
    completedTaskCount,
    totalTaskCount,
    completedMilestoneCount: 0,
    totalMilestoneCount: milestones.length,
    progressText: `${completedTaskCount} of ${totalTaskCount} tasks completed`,
    ...overrides,
  };
}

function dismissOpenRowContextMenu(): void {
  act(() => closeRowContextMenu());
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
  });
}

function mockGoals(overrides: Partial<ReturnType<typeof useGoals>> = {}): void {
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [],
    uiState: 'empty',
    createGoal: async () => undefined,
    updateGoal: async () => undefined,
    deleteGoal: async () => undefined,
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
  fireEvent.press(screen.getByLabelText('Next'));
  fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
  fireEvent.changeText(
    screen.getByLabelText('Planning context'),
    'Build endurance safely with three runs per week over eight weeks.',
  );
  fireEvent.press(screen.getByLabelText('Next'));
  fireEvent.press(screen.getByLabelText('Next'));
}

describe('GoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPremiumPurchaseAvailability).mockReturnValue('web');
    (useIsFocused as jest.MockedFunction<typeof useIsFocused>).mockReturnValue(true);
    mockUserProfile();
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: null,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockImplementation(
      async () => {
        const entitlement = (
          usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>
        )('user-1').entitlement;
        const availableCredits =
          entitlement?.status === 'active' || entitlement?.status === 'in_grace_period' ? 10 : 0;
        return {
          eligible: availableCredits > 0,
          availableCredits,
          welcomeMessageEligible: false,
        };
      },
    );
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
      deleteGoal: async () => undefined,
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

  it('provides complete and confirmed delete actions on active goal rows', async () => {
    const completeGoal = jest.fn(async (_goalId: string, _completed: boolean) => undefined);
    const deleteGoal = jest.fn(async (_goalId: string) => undefined);
    mockGoals({
      goals: [makeGoal()],
      uiState: 'ready',
      setGoalManuallyCompleted: completeGoal,
      deleteGoal,
    });

    render(<GoalsScreen />);

    expect(
      StyleSheet.flatten(screen.getByTestId('goal-row-menu-anchor-goal-1').props.style),
    ).toMatchObject({ alignSelf: 'center', flexShrink: 0 });
    fireEvent.press(screen.getByLabelText('Goal actions for Run a 10k'));
    expect(screen.getByRole('menuitem', { name: 'Complete goal Run a 10k' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Uncomplete goal Run a 10k' })).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('menuitem', { name: 'Complete goal Run a 10k' }));
    });
    expect(completeGoal).toHaveBeenCalledWith('goal-1', true);

    fireEvent.press(screen.getByLabelText('Goal actions for Run a 10k'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete goal Run a 10k' }));
    expect(screen.getByLabelText('Confirm delete goal')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete goal'));
    });
    expect(deleteGoal).toHaveBeenCalledWith('goal-1');
  });

  it('routes goal editing from the row menu and offers uncomplete for completed goals', () => {
    mockGoals({ goals: [makeGoal()], uiState: 'ready' });
    const { unmount } = render(<GoalsScreen />);

    fireEvent.press(screen.getByLabelText('Goal actions for Run a 10k'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit goal Run a 10k' }));
    expect(mockTaskNavigate).toHaveBeenCalledWith('EditGoal', { goalId: 'goal-1' });
    unmount();

    mockGoals({
      goals: [
        makeGoal({
          status: 'completed',
          manuallyCompletedAt: new Date(2026, 7, 1),
        }),
      ],
      uiState: 'ready',
    });
    render(<GoalsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Show completed goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    fireEvent.press(screen.getByLabelText('Goal actions for Run a 10k'));
    expect(screen.getByRole('menuitem', { name: 'Uncomplete goal Run a 10k' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Complete goal Run a 10k' })).toBeNull();
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
      deleteGoal: async () => undefined,
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
    expect(screen.queryByLabelText('No active goals. icon')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'No active goals.' }).props.style)
        .fontSize,
    ).toBe(14);
    expect(
      StyleSheet.flatten(
        screen.getByText('Create a goal to start building a step-by-step plan.').props.style,
      ).fontSize,
    ).toBe(12);
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'No active goals.' }).props.style)
        .textAlign,
    ).toBe('center');
    expect(screen.queryByText('New Goal')).toBeNull();
    expect(screen.getByRole('header', { name: 'Current goals' })).toBeTruthy();
    expect(screen.getByText('0 goals')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter goals' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sort goals' })).toBeTruthy();
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
      progressText: '0 of 0 tasks completed',
    });
    const draftGoal = makeGoal({
      id: 'goal-draft',
      title: 'Write a mystery novel',
      status: 'draft',
    });

    mockedUseGoals.mockReturnValue({
      goals: [draftGoal, activeGoal, completedGoal],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
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
    expect(screen.queryByText('Write a mystery novel')).toBeNull();
    expect(screen.queryByText('Read twelve books')).toBeNull();
    expect(screen.getByRole('header', { name: 'Current goals' })).toBeTruthy();
    expect(screen.getByText('1 goal')).toBeTruthy();
    expect(screen.getByText('Next milestone: Buy running shoes')).toBeTruthy();
    expect(screen.getByText('0 of 0 tasks completed')).toBeTruthy();
    expect(screen.getByLabelText('Goal progress Run a 10k').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
      text: '0 of 0 tasks completed',
    });

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    expect(screen.getByTestId('app-modal-drag-handle')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Show completed goals' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Show draft goals' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Show archived goals' })).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Show completed goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));

    expect(screen.getByText('Read twelve books')).toBeTruthy();
    expect(screen.queryByText('Run a 10k')).toBeNull();
    expect(screen.getByRole('header', { name: 'Completed goals' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Show draft goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));

    expect(screen.getByText('Write a mystery novel')).toBeTruthy();
    expect(screen.queryByText('Run a 10k')).toBeNull();
    expect(screen.getByRole('header', { name: 'Draft goals' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Show archived goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));

    expect(screen.queryByText('Run a 10k')).toBeNull();
    expect(screen.queryByText('Read twelve books')).toBeNull();
    expect(screen.getByRole('header', { name: 'Archived goals' })).toBeTruthy();
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
      deleteGoal: async () => undefined,
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
    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Show completed goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));

    expect(screen.getByText('No completed goals.')).toBeTruthy();
    expect(screen.getByText('Goals you finish will stay available here.')).toBeTruthy();
  });

  it('filters goals by target date and resets the target-date filter', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 6, 9));
    const goals = [
      makeGoal({
        id: 'goal-overdue',
        title: 'Overdue goal',
        estimatedCompletionDate: new Date(2026, 9, 4),
      }),
      makeGoal({
        id: 'goal-week',
        title: 'This week goal',
        estimatedCompletionDate: new Date(2026, 9, 8),
      }),
      makeGoal({
        id: 'goal-month',
        title: 'This month goal',
        estimatedCompletionDate: new Date(2026, 9, 20),
      }),
      makeGoal({
        id: 'goal-next-month',
        title: 'Next month goal',
        estimatedCompletionDate: new Date(2026, 10, 3),
      }),
    ];
    mockGoals({ goals, uiState: 'ready' });
    (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
      events: [],
      uiState: 'idle',
    });

    render(<GoalsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Past due' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    expect(screen.getByLabelText('Open goal Overdue goal')).toBeTruthy();
    expect(screen.queryByLabelText('Open goal This week goal')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'This week' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    expect(screen.getByLabelText('Open goal This week goal')).toBeTruthy();
    expect(screen.queryByLabelText('Open goal Overdue goal')).toBeNull();
    expect(screen.queryByLabelText('Open goal This month goal')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'This month' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    expect(screen.getByLabelText('Open goal This week goal')).toBeTruthy();
    expect(screen.getByLabelText('Open goal This month goal')).toBeTruthy();
    expect(screen.queryByLabelText('Open goal Next month goal')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reset goal filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    expect(screen.getByLabelText('Open goal Overdue goal')).toBeTruthy();
    expect(screen.getByLabelText('Open goal Next month goal')).toBeTruthy();
  });

  it('searches goal titles and descriptions and preserves search and sort when filters reset', () => {
    const zuluGoal = makeGoal({
      id: 'goal-zulu',
      title: 'Zulu Goal',
      description: 'A matching training plan.',
      estimatedCompletionDate: new Date(2026, 8, 1),
      updatedAt: new Date(2026, 6, 23),
    });
    const alphaGoal = makeGoal({
      id: 'goal-alpha',
      title: 'Alpha Goal',
      description: 'A matching training plan.',
      estimatedCompletionDate: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 6, 24),
    });
    const otherGoal = makeGoal({
      id: 'goal-other',
      title: 'Other Goal',
      description: 'Different details.',
      estimatedCompletionDate: new Date(2026, 7, 1),
      updatedAt: new Date(2026, 6, 25),
    });
    mockGoals({ goals: [otherGoal, alphaGoal, zuluGoal], uiState: 'ready' });
    (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
      events: [],
      uiState: 'idle',
    });

    render(<GoalsScreen />);
    fireEvent.changeText(screen.getByLabelText('Search goals by title or description'), 'MATCHING');
    let goalLabels = screen
      .getAllByLabelText(/^Open goal/)
      .map((goal) => goal.props.accessibilityLabel);
    expect(goalLabels).toEqual(['Open goal Zulu Goal', 'Open goal Alpha Goal']);
    expect(screen.queryByLabelText('Open goal Other Goal')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Sort goals' }));
    expect(screen.getByTestId('app-modal-drag-handle')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sort goals by Target date soonest' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sort goals by Target date latest' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sort goals by Updated newest' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sort goals by Updated oldest' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sort goals by Title A to Z' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sort goals by Title Z to A' })).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Sort goals by Updated newest' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply sort goals' }));
    goalLabels = screen
      .getAllByLabelText(/^Open goal/)
      .map((goal) => goal.props.accessibilityLabel);
    expect(goalLabels).toEqual(['Open goal Alpha Goal', 'Open goal Zulu Goal']);

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Show completed goals' }));
    expect(screen.getByLabelText('Open goal Alpha Goal')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    expect(screen.queryByLabelText('Open goal Alpha Goal')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter goals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reset goal filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply goal filters' }));
    goalLabels = screen
      .getAllByLabelText(/^Open goal/)
      .map((goal) => goal.props.accessibilityLabel);
    expect(goalLabels).toEqual(['Open goal Alpha Goal', 'Open goal Zulu Goal']);
    expect(screen.queryByLabelText('Open goal Other Goal')).toBeNull();
    expect(screen.getByText('Sort: Updated ↓')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Search goals by title or description'), 'no match');
    expect(screen.getByText('No matching goals.')).toBeTruthy();
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
      deleteGoal: async () => undefined,
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
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByLabelText('Create Goal modal')).toBeTruthy();

    expect(
      screen.getByPlaceholderText('Example: Complete my first 10k by next month.'),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        'Starting Point, success measures, any sub-goals, any constraints, and timing for each outcome.',
      ),
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('Planning context is required for milestones and tasks.')).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    expect(screen.getByText('Planning details to include')).toBeTruthy();
    expect(screen.queryByText('Objectives: 2-4 concrete results you want.')).toBeNull();
    expect(screen.getByText('Success measures: how you will track progress.')).toBeTruthy();
    expect(screen.getByText('Starting point: what is already in place.')).toBeTruthy();
    expect(screen.getByText('Resources: time, tools, or support available.')).toBeTruthy();
    expect(screen.getByText('Constraints: limits or challenges to plan around.')).toBeTruthy();
    expect(
      screen.getByText('Timing: any intermediate deadlines or a pace you want to maintain.'),
    ).toBeTruthy();
    expect(screen.queryByText('What the AI plans from')).toBeNull();
    expect(screen.queryByLabelText('SMART Specific')).toBeNull();
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Select goal target month'));
    fireEvent.press(screen.getByLabelText('Select goal target October'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2026'));
    expect(screen.queryByText('Unlock AI goal builder with Bearing 360.')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Next'));
    });
    expect(screen.getByText('AI planning uses credits')).toBeTruthy();
    expect(screen.getByText('View Bearing 360 Plans')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Expand milestone 1: Milestone 1'));
    fireEvent.press(screen.getByLabelText('Open actions for milestone 1'));
    expect(screen.getByLabelText('Edit milestone 1')).toBeTruthy();
    dismissOpenRowContextMenu();
    expect(screen.queryByLabelText('Dismiss milestone actions menu')).toBeNull();
    fireEvent.press(screen.getByLabelText('Collapse milestone 1: Milestone 1'));
    expect(screen.queryByLabelText('Open actions for task 1 in milestone 1')).toBeNull();
    fireEvent.press(screen.getByLabelText('Expand milestone 1: Milestone 1'));
    fireEvent.press(screen.getByLabelText('Open actions for milestone 1'));
    dismissOpenRowContextMenu();
    fireEvent.press(screen.getByLabelText('Open actions for task 1 in milestone 1'));
    expect(screen.queryByLabelText('Edit milestone 1')).toBeNull();
    expect(screen.getByLabelText('Edit task 1 in milestone 1')).toBeTruthy();
    dismissOpenRowContextMenu();
    expect(screen.queryByLabelText('Edit milestone 1')).toBeNull();
    expect(screen.queryByLabelText('Edit task 1 in milestone 1')).toBeNull();
    fireEvent.press(screen.getByLabelText(/^Open task 1 in milestone 1:/));
    expect(screen.getByLabelText('Edit task name')).toBeTruthy();
    expect(screen.queryByLabelText('Edit task 1 in milestone 1')).toBeNull();
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Open actions for milestone 1'));
    fireEvent.press(screen.getByLabelText('Edit milestone 1'));
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Buy running shoes');
    fireEvent.changeText(
      screen.getByLabelText('Edit milestone description'),
      'Choose a supportive pair.',
    );
    fireEvent.press(screen.getByLabelText('Select edit milestone month'));
    fireEvent.press(screen.getByLabelText('Select edit milestone November'));
    fireEvent.press(screen.getByLabelText('November 5, 2026'));
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Open actions for task 1 in milestone 1'));
    fireEvent.press(screen.getByLabelText('Edit task 1 in milestone 1'));
    fireEvent.changeText(screen.getByLabelText('Edit task name'), 'Visit running stores');
    fireEvent.changeText(screen.getByLabelText('Edit task starter cue'), 'Visit two stores');
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Save goal'));
    expect(
      screen.getByText('Milestone 1 must finish on or before the goal target date.'),
    ).toBeTruthy();
    expect(createGoalMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Open actions for milestone 1'));
    fireEvent.press(screen.getByLabelText('Edit milestone Buy running shoes'));
    fireEvent.press(screen.getByLabelText('Select edit milestone month'));
    fireEvent.press(screen.getByLabelText('Select edit milestone August'));
    fireEvent.press(screen.getByLabelText('August 5, 2026'));
    fireEvent.press(screen.getByLabelText('Save plan item changes'));

    fireEvent.press(screen.getByLabelText('Add task to draft milestone 1'));
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Open actions for task 2 in milestone 1'));
    const menuTop = StyleSheet.flatten(screen.getByLabelText('task actions menu').props.style).top;
    expect(Number.isFinite(menuTop)).toBe(true);
    fireEvent.press(screen.getByLabelText('Delete task 2 in milestone 1'));
    expect(screen.getByLabelText('Delete task? confirmation dialog')).toBeTruthy();
    expect(screen.getByText('This task will be deleted from the goal draft.')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.queryByLabelText('Keep item Delete task?')).toBeNull();
    fireEvent.press(screen.getByLabelText('Confirm deletion of plan item'));
    expect(screen.queryByText('Untitled task')).toBeNull();

    fireEvent.press(screen.getByLabelText('Add another draft milestone'));
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Add task to draft milestone 1'));
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Open actions for task 2 in milestone 1'));
    expect(screen.getAllByLabelText('task actions menu')).toHaveLength(1);
    dismissOpenRowContextMenu();
    fireEvent.press(screen.getByLabelText('Open actions for milestone 2'));
    fireEvent.press(screen.getByLabelText('Delete milestone 2'));
    expect(screen.getByLabelText('Delete milestone? confirmation dialog')).toBeTruthy();
    expect(
      screen.getByText('This milestone and all of its tasks will be deleted from the goal draft.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cancel plan item removal'));
    expect(screen.queryByLabelText('Edit milestone name')).toBeNull();
    expect(screen.getByLabelText('Open actions for milestone 2')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open actions for milestone 2'));
    fireEvent.press(screen.getByLabelText('Delete milestone 2'));
    fireEvent.press(screen.getByLabelText('Confirm deletion of plan item'));
    expect(screen.queryByLabelText('Open actions for milestone 2')).toBeNull();

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

  it('creates a manual goal draft as soon as the goal basics validate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 20));
    const draftGoal = makeGoal({ id: 'goal-draft-1', title: 'Run a 10k', status: 'draft' });
    const goals: GoalWithMilestones[] = [];
    const createGoalDraft = jest.fn(async () => {
      goals.push(draftGoal);
      return draftGoal.id;
    });

    (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
      goals,
      uiState: 'empty',
      createGoal: jest.fn(async () => undefined),
      createGoalDraft,
      saveGoalDraft: jest.fn(async () => ({ milestones: [] })),
      activateGoalDraft: jest.fn(async () => undefined),
      updateGoal: jest.fn(async () => undefined),
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: jest.fn(async () => undefined),
      setMilestoneManuallyCompleted: jest.fn(async () => undefined),
      createMilestone: jest.fn(async () => undefined),
      deleteMilestone: jest.fn(async () => undefined),
      updateMilestone: jest.fn(async () => undefined),
      reorderMilestones: jest.fn(async () => undefined),
      retry: jest.fn(),
    });
    (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
      events: [],
      uiState: 'idle',
    });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(screen.getByLabelText('Planning context'), 'Train three times weekly.');
    fireEvent.press(screen.getByLabelText('Next'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Next'));
    });

    expect(createGoalDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Run a 10k',
        description: 'Train three times weekly.',
        status: 'draft',
        milestones: [],
      }),
    );
    expect(screen.getByText('AI planning uses credits')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Close Create Goal'));

    expect(await screen.findByText('Goal draft saved')).toBeTruthy();
    expect(
      await screen.findByText(
        'Your goal draft is available on the Goals screen. You can return to it later. Close the wizard?',
      ),
    ).toBeTruthy();
    fireEvent.press(await screen.findByLabelText('Close goal wizard and return to Goals'));

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Draft goals' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Filter goals' })).toBeTruthy();
      expect(screen.getByText('Run a 10k')).toBeTruthy();
    });
  });

  it('allows closing the wizard without saving after draft autosave fails', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 20));
    const draftGoal = makeGoal({ id: 'goal-draft-1', title: 'Run a 10k', status: 'draft' });
    const goals: GoalWithMilestones[] = [];
    const createGoalDraft = jest.fn(async () => {
      goals.push(draftGoal);
      return draftGoal.id;
    });
    const saveGoalDraft = jest.fn(
      async (_goalId: string, _input: GoalDraftSaveInput): Promise<GoalDraftSaveResult> => {
        throw new Error('Draft save failed.');
      },
    );

    (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
      goals,
      uiState: 'empty',
      createGoal: jest.fn(async () => undefined),
      createGoalDraft,
      saveGoalDraft,
      activateGoalDraft: jest.fn(async () => undefined),
      updateGoal: jest.fn(async () => undefined),
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
      events: [],
      uiState: 'idle',
    });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(screen.getByLabelText('Planning context'), 'Train three times weekly.');
    fireEvent.press(screen.getByLabelText('Next'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Next'));
    });
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Close Create Goal'));

    expect(
      await screen.findByText(
        'Your last saved draft is available on the Goals screen. Close the wizard without the latest changes?',
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Keep editing goal draft'));
    expect(screen.getByText('Step 5 of 5: Milestones & Tasks')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close Create Goal'));
    fireEvent.press(await screen.findByLabelText('Close goal wizard and return to Goals'));

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Draft goals' })).toBeTruthy();
      expect(screen.getByText('Run a 10k')).toBeTruthy();
    });
    expect(saveGoalDraft).toHaveBeenCalled();
  });

  it('opens the premium paywall from the AI planning step for free users', async () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [],
      uiState: 'empty',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
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

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Next'));
    await screen.findByLabelText('AI credits available: 0');
    expect(screen.getByText('AI planning uses credits')).toBeTruthy();
    expect(
      screen.getByText(
        'Bearing 360 includes recurring AI credits and access to credit packs for AI-assisted goal planning.',
      ),
    ).toBeTruthy();
    await screen.findByLabelText('View Bearing 360 plans for AI goal builder');
    fireEvent.press(screen.getByLabelText('View Bearing 360 plans for AI goal builder'));

    expect(navigate).toHaveBeenCalledWith('PremiumPaywall', {
      feature: 'ai_goal_builder',
      source: 'ai_goal_builder',
    });
  });

  it('does not own paywall legal documents locally', async () => {
    mockEmptyGoals();
    const navigate = jest.fn();

    render(<GoalsScreen route={{ params: { createGoal: true } }} navigation={{ navigate }} />);

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    fireEvent.press(screen.getByLabelText('Next'));
    await screen.findByLabelText('View Bearing 360 plans for AI goal builder');
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
    await waitFor(() => expect(screen.getByLabelText('AI credits available: 10')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    expect(screen.getByRole('progressbar', { name: 'Generating AI goal plan' })).toBeTruthy();
    expect(screen.getByText('Creating your draft...')).toBeTruthy();
    expect(
      screen.getByText('Building milestones and tasks usually takes a few seconds.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('app-button-loading')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Generate AI goal plan' }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });
    expect(screen.getByLabelText('Back')).toBeDisabled();
    expect(screen.getByLabelText('Next')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Back'));
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('Step 4 of 5: AI Planning')).toBeTruthy();
  });

  it('generates an editable AI draft before saving for premium users', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 23, 9, 0, 0));

    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;
    (
      getAiPlanningErrorDetails as jest.MockedFunction<typeof getAiPlanningErrorDetails>
    ).mockReturnValue('AI planning is temporarily unavailable. Please try again shortly.');
    const createGoalMock = jest.fn(async () => undefined);
    const createGoalDraftMock = jest.fn(async () => 'goal-draft-1');
    const saveGoalDraftMock = jest.fn(
      async (_goalId: string, _input: GoalDraftSaveInput): Promise<GoalDraftSaveResult> => ({
        milestones: [],
      }),
    );
    const activateGoalDraftMock = jest.fn(async () => undefined);
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
      createGoalDraft: createGoalDraftMock,
      saveGoalDraft: saveGoalDraftMock,
      activateGoalDraft: activateGoalDraftMock,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
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
          id: 'server-milestone-1',
          title: 'Build a running base',
          description: 'Establish a consistent weekly rhythm.',
          targetDate: '2026-08-20',
          tasks: [
            {
              id: 'server-task-1',
              title: 'Choose weekly run times',
              description: 'Reserve three repeatable windows.',
              starter: 'Open the calendar.',
              targetDate: '2026-08-20',
            },
          ],
        },
      ],
      goalId: 'goal-draft-1',
      timelineSummary: 'Build consistency before increasing distance.',
      requestId: '123e4567-e89b-42d3-a456-426614174000',
      availableCredits: 9,
    });

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Select goal target year'));
    fireEvent.press(screen.getByLabelText('Select goal target year 2027'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Next'));
    });

    expect(
      screen.getByText(
        'AI planning is optional. Generate a draft, or select Next to add milestones and tasks yourself.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('What the AI plans from')).toBeTruthy();
    expect(screen.queryByText('Bearing 360 Enabled')).toBeNull();
    expect(screen.queryByLabelText('View Bearing 360 plans for AI goal builder')).toBeNull();
    await waitFor(() => expect(screen.getByLabelText(/AI credits available: 10/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });

    await waitFor(() =>
      expect(screen.getByRole('header', { name: 'Your goal is ready' })).toBeTruthy(),
    );
    const planningButtons = screen.getAllByRole('button');
    expect(
      planningButtons.indexOf(screen.getByLabelText('Edit goal details before regenerating')),
    ).toBeGreaterThan(planningButtons.indexOf(screen.getByLabelText('Regenerate AI goal plan')));
    expect(
      screen.getByText(
        'Select Next to review and edit each generated milestone and its tasks before saving.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText(/AI credits available: 9/)).toBeTruthy();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(700);
    });
    expect(saveGoalDraftMock).toHaveBeenCalledTimes(2);
    expect(createGoalDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', title: 'Run a 10k' }),
    );
    expect(mockedGenerateAiGoalPlanDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Run a 10k',
        description: 'Train consistently for eight weeks.',
        goalId: 'goal-draft-1',
        provider: 'openai',
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
    expect(mockedGenerateAiGoalPlanDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ goalId: 'goal-draft-1' }),
    );

    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('Build a running base')).toBeTruthy();
    expect(screen.queryByText('Choose weekly run times')).toBeNull();
    fireEvent.press(screen.getByLabelText('Expand milestone 1: Build a running base'));
    expect(screen.getByText('Choose weekly run times')).toBeTruthy();
    const firstTaskRow = screen.getByLabelText(/^Open task 1 in milestone 1:/);
    expect(within(firstTaskRow).getByTestId('draft-task-number-1')).toHaveTextContent('1');
    expect(screen.getByText('TASKS')).toBeTruthy();
    expect(screen.queryByText('TASK 1')).toBeNull();
    fireEvent.press(screen.getByLabelText('Open actions for milestone 1'));
    fireEvent.press(screen.getByLabelText('Edit milestone Build a running base'));
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Build consistency');
    fireEvent.press(screen.getByLabelText('Save plan item changes'));
    fireEvent.press(screen.getByLabelText('Open actions for task 1 in milestone 1'));
    fireEvent.press(screen.getByLabelText('Edit task 1 in milestone 1'));
    expect(screen.getByDisplayValue('Choose weekly run times')).toBeTruthy();
    expect(screen.getAllByLabelText('August 24, 2026')).toHaveLength(1);
    fireEvent.changeText(screen.getByLabelText('Edit task name'), 'Schedule weekly runs');
    fireEvent.press(screen.getByLabelText('Save plan item changes'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save goal'));
    });

    await waitFor(() => expect(activateGoalDraftMock).toHaveBeenCalledWith('goal-draft-1'));
    expect(createGoalMock).not.toHaveBeenCalled();
    expect(saveGoalDraftMock).toHaveBeenCalledWith(
      'goal-draft-1',
      expect.objectContaining({
        milestones: [
          expect.objectContaining({
            id: 'server-milestone-1',
            tasks: [expect.objectContaining({ id: 'server-task-1' })],
          }),
        ],
      }),
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
      deleteGoal: async () => undefined,
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
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Build endurance safely with three runs per week over eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Next'));

    await waitFor(() => expect(screen.getByLabelText(/AI credits available: 10/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });

    await waitFor(() =>
      expect(
        screen.getByText('AI planning is temporarily unavailable. Please try again shortly.'),
      ).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });
    const generationCalls = (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mock.calls;
    expect(generationCalls[0][0].requestId).toBe(generationCalls[1][0].requestId);
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByLabelText('Expand milestone 1: Milestone 1')).toBeTruthy();
  });

  it('explains when the server cannot confirm AI planning access', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockRejectedValue({ code: 'functions/permission-denied' });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByLabelText(/AI credits available: 10/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    });

    expect(
      screen.getByText('AI planning access could not be confirmed. Try again shortly.'),
    ).toBeTruthy();
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
      welcomeMessageEligible: false,
    });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();

    await waitFor(() => expect(screen.getByLabelText(/AI credits available: 0/)).toBeTruthy());
    expect(screen.getByLabelText('Generate AI goal plan').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.getByText('You have used your available AI credits')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByLabelText('Expand milestone 1: Milestone 1')).toBeTruthy();
  });

  it('keeps the welcome message after a user spends one welcome AI credit', async () => {
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockResolvedValue({
      eligible: true,
      availableCredits: 1,
      welcomeMessageEligible: true,
    });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();

    await waitFor(() => expect(screen.getByLabelText('AI credits available: 1')).toBeTruthy());
    expect(
      screen.getByText(
        'Welcome! Your account includes two free AI credits. Use them to turn your goal details into a plan with milestones and tasks. Select Generate Goal, then review and edit the plan before saving.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Generate Goal')).toBeTruthy();
    expect(screen.queryByText('Generate Draft')).toBeNull();
  });

  it('does not restore the welcome message after a subscription ends', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'expired' } as never,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockResolvedValue({
      eligible: true,
      availableCredits: 1,
      welcomeMessageEligible: false,
    });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();

    await waitFor(() => expect(screen.getByLabelText('AI credits available: 1')).toBeTruthy());
    expect(screen.queryByText(/Welcome! Your account includes two free AI credits/)).toBeNull();
  });

  it('refreshes the balance and explains backend credit exhaustion', async () => {
    (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>)
      .mockResolvedValueOnce({
        eligible: true,
        availableCredits: 1,
        welcomeMessageEligible: false,
      })
      .mockResolvedValueOnce({
        eligible: true,
        availableCredits: 0,
        welcomeMessageEligible: false,
      });
    (
      generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
    ).mockRejectedValue({ code: 'functions/resource-exhausted' });
    mockEmptyGoals();

    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    await waitFor(() => expect(screen.getByLabelText(/AI credits available: 1/)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    await waitFor(() =>
      expect(screen.getByText('You have used your available AI credits')).toBeTruthy(),
    );
    expect(screen.getByLabelText(/AI credits available: 0/)).toBeTruthy();
  });

  it('keeps navigation locked through failed exhaustion recovery and shows only the known zero state', async () => {
    let rejectBalance!: (error: Error) => void;
    jest.mocked(usePremiumEntitlement).mockReturnValue({
      entitlement: { status: 'active' } as never,
      uiState: 'ready',
      error: null,
    });
    jest
      .mocked(getAiCreditStatus)
      .mockResolvedValueOnce({
        eligible: true,
        availableCredits: 1,
        welcomeMessageEligible: false,
      })
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectBalance = reject;
          }),
      );
    jest
      .mocked(generateAiGoalPlanDraft)
      .mockRejectedValue({ code: 'functions/resource-exhausted' });
    mockEmptyGoals();
    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    await screen.findByLabelText('AI credits available: 1');
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    await waitFor(() => expect(getAiCreditStatus).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Back')).toBeDisabled();
    expect(screen.getByLabelText('Next')).toBeDisabled();
    await act(async () => rejectBalance(new Error('offline')));
    expect(screen.getByLabelText('AI credits available: 0')).toBeTruthy();
    expect(screen.getAllByText('You have used your available AI credits')).toHaveLength(1);
    expect(screen.queryByText('AI credit balance is unavailable right now.')).toBeNull();
    expect(screen.getByLabelText('Generate AI goal plan')).toBeDisabled();
    expect(screen.getByLabelText('Back')).toBeEnabled();
    expect(screen.getByLabelText('Next')).toBeEnabled();
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
    await waitFor(() => expect(screen.getByLabelText(/AI credits available: 10/)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'An AI plan is already being created. Please wait a moment and try again.',
        ),
      ).toBeTruthy(),
    );
  });

  it.each([null, 'expired', 'canceled', 'ended', 'loading'])(
    'allows authenticated credits with subscription status %s',
    async (status) => {
      (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
        entitlement:
          status === 'ended'
            ? ({ status: 'active', periodEndAt: new Date('2020-01-01') } as never)
            : status && status !== 'loading'
              ? ({ status } as never)
              : null,
        uiState: status === 'loading' ? 'loading' : 'ready',
        error: null,
      });
      (getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>).mockResolvedValue({
        eligible: true,
        availableCredits: 1,
        welcomeMessageEligible: false,
      });
      (
        generateAiGoalPlanDraft as jest.MockedFunction<typeof generateAiGoalPlanDraft>
      ).mockImplementation(() => new Promise(() => undefined));
      mockEmptyGoals();
      render(<GoalsScreen route={{ params: { createGoal: true } }} />);
      openAiPlanningStep();
      await screen.findByLabelText('AI credits available: 1');
      expect(screen.getByLabelText('Generate AI goal plan')).toBeEnabled();
      expect(screen.queryByLabelText('Get more AI credits from AI planning')).toBeNull();
      fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
      await waitFor(() => expect(generateAiGoalPlanDraft).toHaveBeenCalledTimes(1));
    },
  );

  it.each([5, 0, null])(
    'requires a confirmed positive same-step balance after member purchase (balance %s)',
    async (balance) => {
      (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
        entitlement: { status: 'active' } as never,
        uiState: 'ready',
        error: null,
      });
      jest.mocked(getPremiumPurchaseAvailability).mockReturnValue('available');
      jest
        .mocked(loadCreditPacks)
        .mockResolvedValue([
          { packageIdentifier: 'credits_5', amount: 5, currencyCode: 'AIC', priceText: '$4.99' },
        ]);
      jest.mocked(purchaseCreditPack).mockResolvedValue('success');
      jest
        .mocked(getAiCreditStatus)
        .mockResolvedValueOnce({
          eligible: false,
          availableCredits: 0,
          welcomeMessageEligible: false,
        })
        .mockResolvedValueOnce({
          eligible: true,
          availableCredits: 5,
          welcomeMessageEligible: false,
        })
        .mockImplementation(async () => {
          if (balance === null) throw new Error('offline');
          return {
            eligible: balance > 0,
            availableCredits: balance,
            welcomeMessageEligible: false,
          };
        });
      mockEmptyGoals();
      render(<GoalsScreen route={{ params: { createGoal: true } }} />);
      openAiPlanningStep();
      await screen.findByLabelText('AI credits available: 0');
      expect(screen.getByLabelText('Generate AI goal plan')).toBeDisabled();
      fireEvent.press(screen.getByLabelText('Get more AI credits from AI planning'));
      fireEvent.press(await screen.findByRole('button', { name: 'Continue with 5 AI credits' }));
      fireEvent.press(
        screen.getByRole('button', { name: 'Continue to the store for 5 AI credits' }),
      );
      await screen.findByText('AI credits added');
      fireEvent.press(screen.getByRole('button', { name: 'Close credit pack purchase' }));
      if (balance === null) await screen.findByLabelText('Retry AI credit balance');
      else await screen.findByLabelText(`AI credits available: ${balance}`);
      expect(screen.getByText('Step 4 of 5: AI Planning')).toBeTruthy();
      if (balance !== null && balance > 0) {
        expect(screen.getByLabelText('Generate AI goal plan')).toBeEnabled();
        expect(screen.queryByText('AI planning uses credits')).toBeNull();
      } else {
        expect(screen.getByLabelText('Generate AI goal plan')).toBeDisabled();
        fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
        expect(generateAiGoalPlanDraft).not.toHaveBeenCalled();
      }
      expect(getAiCreditStatus).toHaveBeenCalledTimes(3);
    },
  );

  it('blocks unknown and failed balances, retries, and refreshes on every step visit', async () => {
    let resolveBalance!: (value: {
      eligible: boolean;
      availableCredits: number;
      welcomeMessageEligible: boolean;
    }) => void;
    const lookup = getAiCreditStatus as jest.MockedFunction<typeof getAiCreditStatus>;
    lookup
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveBalance = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        eligible: true,
        availableCredits: 1,
        welcomeMessageEligible: false,
      })
      .mockResolvedValueOnce({
        eligible: false,
        availableCredits: 0,
        welcomeMessageEligible: false,
      });
    mockEmptyGoals();
    render(<GoalsScreen route={{ params: { createGoal: true } }} />);
    openAiPlanningStep();
    expect(screen.getByLabelText('Generate AI goal plan')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Generate AI goal plan'));
    expect(generateAiGoalPlanDraft).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Back'));
    fireEvent.press(screen.getByLabelText('Next'));
    await screen.findByLabelText('Retry AI credit balance');
    expect(screen.getByText('AI CREDITS AVAILABLE')).toBeTruthy();
    await act(async () =>
      resolveBalance({
        eligible: true,
        availableCredits: 10,
        welcomeMessageEligible: false,
      }),
    );
    expect(screen.queryByLabelText('AI credits available: 10')).toBeNull();
    expect(screen.getByLabelText('Generate AI goal plan')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Retry AI credit balance'));
    await screen.findByLabelText('AI credits available: 1');
    expect(screen.getByLabelText('Generate AI goal plan')).toBeEnabled();
    expect(screen.queryByText('AI credit balance is unavailable right now.')).toBeNull();
    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Back'));
    await screen.findByLabelText('AI credits available: 0');
    expect(screen.getByLabelText('Generate AI goal plan')).toBeDisabled();
    expect(lookup).toHaveBeenCalledTimes(4);
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
      deleteGoal: async () => undefined,
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

    fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.changeText(screen.getByLabelText('Goal outcome'), 'Run a 10k');
    fireEvent.changeText(
      screen.getByLabelText('Planning context'),
      'Train consistently for eight weeks.',
    );
    fireEvent.press(screen.getByLabelText('Next'));

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
    fireEvent.press(screen.getByLabelText('Next'));

    expect(screen.queryByText('Estimated completion date must be today or later.')).toBeNull();
    expect(screen.getByText('Step 4 of 5: AI Planning')).toBeTruthy();

    jest.useRealTimers();
  });

  it('opens GoalDetail as a stack route from the goals list', () => {
    mockGoals({ goals: [makeGoal()], uiState: 'ready' });
    render(<GoalsScreen />);

    fireEvent.press(screen.getByLabelText('Open goal Run a 10k'));

    expect(mockTaskNavigate).toHaveBeenCalledWith('GoalDetail', { goalId: 'goal-1' });
  });

  it('shows task-derived milestone progress without manual completion controls', () => {
    const setMilestoneManuallyCompleted = jest.fn(async () => undefined);
    const milestone = makeMilestone();
    mockGoals({
      goals: [makeGoal({ milestones: [milestone] })],
      uiState: 'ready',
      setMilestoneManuallyCompleted,
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    expect(screen.getByText(/Current\s*· 0 of 0 tasks/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Mark Done milestone Buy running shoes' }),
    ).toBeNull();
    expect(setMilestoneManuallyCompleted).not.toHaveBeenCalled();
  });

  it('shows automatic completion guidance without legacy manual reopen controls', () => {
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

    render(
      <MilestoneDetailScreen
        route={{ params: { goalId: 'goal-1', milestoneId: 'milestone-1' } }}
        navigation={{ goBack: jest.fn(), navigate: mockTaskNavigate } as never}
      />,
    );

    expect(
      screen.getByText(
        '* Completion updates automatically when tasks are completed or uncompleted.',
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Reopen milestone')).toBeNull();
    expect(screen.queryByLabelText('Manually complete milestone')).toBeNull();
  });

  it('opens goal details and marks a goal complete from edit mode', async () => {
    const markGoalCompletedMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;

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
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: markGoalCompletedMock,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });

    render(
      <EditGoalScreen
        route={{ params: { goalId: 'goal-1' } }}
        navigation={{ goBack: jest.fn() } as never}
      />,
    );

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

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: updateGoalMock,
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });

    render(
      <EditGoalScreen
        route={{ params: { goalId: 'goal-1' } }}
        navigation={{ goBack: jest.fn() } as never}
      />,
    );

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

  it('does not expose milestone scheduling or subscribe to linked events', () => {
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
      deleteGoal: async () => undefined,
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

    render(
      <MilestoneDetailScreen
        route={{ params: { goalId: 'goal-1', milestoneId: 'milestone-1' } }}
        navigation={{ goBack: jest.fn(), navigate: mockTaskNavigate } as never}
      />,
    );

    expect(screen.queryByText('Treadmill session')).toBeNull();
    expect(screen.queryByText('Linked Events')).toBeNull();
    expect(screen.queryByText('No events scheduled.')).toBeNull();
    expect(screen.queryByLabelText('Schedule milestone event')).toBeNull();
    expect(mockedUseGoalStepEvents).not.toHaveBeenCalled();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('moves a milestone down with the arrow controls', async () => {
    const reorderMilestonesMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;

    mockedUseGoals.mockReturnValue({
      goals: [makeOrderedGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: reorderMilestonesMock,
      retry: jest.fn(),
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Milestone actions for Buy running shoes' }),
    );
    await act(async () => {
      fireEvent.press(
        screen.getByRole('menuitem', { name: 'Move milestone Buy running shoes down' }),
      );
    });

    await waitFor(() => {
      expect(reorderMilestonesMock).toHaveBeenCalledWith('goal-1', ['milestone-2', 'milestone-1']);
    });
  });

  it('deletes a milestone from its details', async () => {
    const deleteMilestoneMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: deleteMilestoneMock,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    const goBack = jest.fn();
    render(
      <MilestoneDetailScreen
        route={{ params: { goalId: 'goal-1', milestoneId: 'milestone-1' } }}
        navigation={{ goBack, navigate: mockTaskNavigate } as never}
      />,
    );
    fireEvent.press(screen.getByLabelText('Milestone actions'));
    fireEvent.press(await screen.findByLabelText('Delete milestone'));
    expect(deleteMilestoneMock).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete milestone'));
    });

    await waitFor(() => {
      expect(deleteMilestoneMock).toHaveBeenCalledWith('milestone-1');
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  it('omits linked-event empty and error text from milestone details', () => {
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
    const mockedUseGoalStepEvents = useMilestoneEvents as jest.MockedFunction<
      typeof useMilestoneEvents
    >;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: async () => undefined,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    mockedUseGoalStepEvents.mockReturnValue({ events: [], uiState: 'error' });

    render(
      <MilestoneDetailScreen
        route={{ params: { goalId: 'goal-1', milestoneId: 'milestone-1' } }}
        navigation={{ goBack: jest.fn(), navigate: mockTaskNavigate } as never}
      />,
    );

    expect(screen.queryByText('No events scheduled.')).toBeNull();
    expect(screen.queryByText('Linked Events')).toBeNull();
    expect(screen.queryByText('Unable to load linked events.')).toBeNull();
  });

  it('edits a milestone title and description', async () => {
    const updateMilestoneMock = jest.fn(async () => undefined);
    const mockedUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;

    mockedUseGoals.mockReturnValue({
      goals: [makeGoal()],
      uiState: 'ready',
      createGoal: async () => undefined,
      updateGoal: async () => undefined,
      deleteGoal: async () => undefined,
      setGoalManuallyCompleted: async () => undefined,
      setMilestoneManuallyCompleted: async () => undefined,
      createMilestone: async () => undefined,
      deleteMilestone: async () => undefined,
      updateMilestone: updateMilestoneMock,
      reorderMilestones: async () => undefined,
      retry: jest.fn(),
    });
    render(
      <EditMilestoneScreen
        route={{ params: { goalId: 'goal-1', milestoneId: 'milestone-1' } }}
        navigation={{ goBack: jest.fn() } as never}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Choose a local race');
    fireEvent.changeText(screen.getByLabelText('Edit milestone description'), 'Compare dates.');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save milestone changes' }));
    });

    await waitFor(() => {
      expect(updateMilestoneMock).toHaveBeenCalledWith('milestone-1', {
        title: 'Choose a local race',
        description: 'Compare dates.',
      });
    });
  });

  it('routes linked tasks from MilestoneDetail to TaskDetail', () => {
    const milestoneTask = makeTask({ starter: 'Compare races.' });
    const taskMilestone = makeMilestone({ tasks: [milestoneTask] });
    mockGoals({ goals: [makeGoal({ milestones: [taskMilestone] })], uiState: 'ready' });
    render(
      <MilestoneDetailScreen
        route={{ params: { goalId: 'goal-1', milestoneId: taskMilestone.id } }}
        navigation={{ goBack: jest.fn(), navigate: mockTaskNavigate } as never}
      />,
    );
    expect(screen.queryByText('Start here: Compare races.')).toBeNull();
    fireEvent.press(screen.getByLabelText(`Open task ${milestoneTask.title}`));
    expect(mockTaskNavigate).toHaveBeenCalledWith('TaskDetail', { taskId: milestoneTask.id });
  });

  it('persists milestone date edits through the goals-list details entry point', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 6, 12));
    const updateMilestone = jest.fn(async () => undefined);
    const datedMilestone = makeMilestone({ estimatedFinishDate: new Date(2026, 10, 1) });
    mockGoals({
      goals: [
        makeGoal({
          estimatedCompletionDate: new Date(2026, 11, 1),
          milestones: [datedMilestone],
        }),
      ],
      uiState: 'ready',
      updateMilestone,
    });
    const goBack = jest.fn();
    render(
      <EditMilestoneScreen
        route={{ params: { goalId: 'goal-1', milestoneId: datedMilestone.id } }}
        navigation={{ goBack } as never}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'November 15, 2026' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(updateMilestone).toHaveBeenCalledWith(datedMilestone.id, {
      title: datedMilestone.title,
      description: datedMilestone.description,
      estimatedFinishDate: new Date(2026, 10, 15),
    });
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
