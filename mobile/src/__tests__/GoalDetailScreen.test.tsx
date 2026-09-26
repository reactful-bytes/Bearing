import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { useMilestoneEvents } from '../features/goals/useMilestoneEvents';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useUserProfile } from '../features/profile/useUserProfile';
import { GoalMilestoneWithTasks, GoalWithMilestones } from '../features/goals/goalTypes';
import { CompleteTaskInput, CreateTaskInput, TaskRecord } from '../features/tasks/taskTypes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: mockGoBack, navigate: mockNavigate })),
}));

jest.mock('../features/goals/useGoals', () => ({ useGoals: jest.fn() }));
jest.mock('../features/tasks/useTasks', () => ({ useTasks: jest.fn() }));
jest.mock('../features/goals/useMilestoneEvents', () => ({ useMilestoneEvents: jest.fn() }));
jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({ useUserProfile: jest.fn() }));
jest.mock('../services/firebase/firebaseEvents', () => ({
  subscribeToEventsByMilestoneId: jest.fn(() => jest.fn()),
}));

const milestone: GoalMilestoneWithTasks = {
  id: 'milestone-1',
  userId: 'user-1',
  goalId: 'goal-1',
  title: 'Choose a race date',
  description: 'Pick a local event.',
  estimatedFinishDate: new Date(2026, 8, 10),
  order: 0,
  status: 'pending' as const,
  manuallyCompletedAt: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
  tasks: [],
  completedTaskCount: 0,
  totalTaskCount: 0,
  progressPercent: 0,
  progressText: '0 of 0 tasks',
};

const goal: GoalWithMilestones = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Run a 10k',
  description: 'Build an eight-week training block.',
  smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
  estimatedCompletionDate: new Date(2026, 9, 1),
  nextMilestoneId: milestone.id,
  manuallyCompletedAt: null,
  status: 'active',
  isAiAssisted: false,
  aiPlanVersion: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
  milestones: [milestone],
  tasks: [],
  nextMilestone: milestone,
  nextTask: null,
  completedTaskCount: 0,
  totalTaskCount: 1,
  completedMilestoneCount: 0,
  totalMilestoneCount: 1,
  progressText: '0 of 1 milestones complete',
};

const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Book the race',
  description: 'Choose and register for the event.',
  starter: '',
  goalId: 'goal-1',
  milestoneId: 'milestone-1',
  dueDate: new Date(2026, 8, 8),
  scheduledStart: null,
  scheduledEnd: null,
  allDay: true,
  status: 'active',
  completionSource: null,
  completedAt: null,
  completedEventId: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
};

function mockHooks(
  overrides: {
    createTask?: (input: CreateTaskInput) => Promise<void>;
    completeTask?: (taskId: string, input: CompleteTaskInput) => Promise<void>;
  } = {},
): void {
  (useUserProfile as jest.MockedFunction<typeof useUserProfile>).mockReturnValue({
    profile: { locale: 'en-US', timeFormat: '12-hour' },
  } as never);
  (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
    publicationCalendarTitle: null,
    createEvent: jest.fn(async () => 'event-1'),
    publishEvent: jest.fn(async () => undefined),
  });
  (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
    events: [],
    uiState: 'idle',
  });
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [goal],
    uiState: 'ready',
    createGoal: jest.fn(async () => undefined),
    updateGoal: jest.fn(async () => undefined),
    setGoalManuallyCompleted: jest.fn(async () => undefined),
    setMilestoneManuallyCompleted: jest.fn(async () => undefined),
    createMilestone: jest.fn(async () => undefined),
    deleteMilestone: jest.fn(async () => undefined),
    updateMilestone: jest.fn(async () => undefined),
    reorderMilestones: jest.fn(async () => undefined),
    retry: jest.fn(),
  });
  (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
    tasks: [task],
    uiState: 'ready',
    createTask:
      overrides.createTask ?? jest.fn(async (_input: CreateTaskInput): Promise<void> => undefined),
    updateTask: jest.fn(async () => undefined),
    completeTask:
      overrides.completeTask ??
      jest.fn(async (_taskId: string, _input: CompleteTaskInput): Promise<void> => undefined),
    convertTaskToEvent: jest.fn(async () => ({
      eventId: 'event-1',
      eventInput: {
        title: task.title,
        description: task.description,
        startAt: new Date(),
        endAt: new Date(),
        timezone: 'UTC',
      },
      created: true,
    })),
    deleteTask: jest.fn(async () => undefined),
    retry: jest.fn(),
  });
}

describe('GoalDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    mockHooks();
  });

  it('renders linked tasks and keeps task completion independent from row navigation', async () => {
    const completeTask = jest.fn(async () => undefined);
    mockHooks({ completeTask });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.getAllByText('Book the race')).toHaveLength(2);
    fireEvent.press(screen.getAllByRole('checkbox', { name: 'Mark Book the race complete' })[0]);
    fireEvent.press(screen.getAllByRole('button', { name: 'Open task Book the race' })[0]);

    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledWith('task-1', { completionSource: 'manual' });
    });
    expect(screen.getByText('Task Details')).toBeTruthy();
  });

  it('keeps the detail header below the top safe area', () => {
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 24,
      right: 0,
      bottom: 0,
      left: 0,
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    expect(
      StyleSheet.flatten(screen.getByTestId('goal-detail-scroll').props.contentContainerStyle),
    ).toEqual(expect.objectContaining({ paddingTop: 32 }));
  });

  it('creates a task with the goal and milestone context', async () => {
    const createTask = jest.fn(async () => undefined);
    mockHooks({ createTask });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.changeText(screen.getByLabelText('Task title'), 'Register for the race');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    });

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({
        title: 'Register for the race',
        description: '',
        starter: '',
        goalId: 'goal-1',
        milestoneId: 'milestone-1',
      });
    });
  });

  it('switches to the operational timeline and shows linked task counts', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'timeline' } }} />);

    expect(screen.getAllByText('Timeline')).toHaveLength(2);
    expect(screen.getByText('Current · 0 of 0 tasks')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open milestone Choose a race date' })).toBeTruthy();
  });
});
