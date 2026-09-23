import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { useGoalStepEvents } from '../features/goals/useGoalStepEvents';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useUserProfile } from '../features/profile/useUserProfile';
import { GoalWithSteps } from '../features/goals/goalTypes';
import { CompleteTaskInput, CreateTaskInput, TaskRecord } from '../features/tasks/taskTypes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: mockGoBack, navigate: mockNavigate })),
}));

jest.mock('../features/goals/useGoals', () => ({ useGoals: jest.fn() }));
jest.mock('../features/tasks/useTasks', () => ({ useTasks: jest.fn() }));
jest.mock('../features/goals/useGoalStepEvents', () => ({ useGoalStepEvents: jest.fn() }));
jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({ useUserProfile: jest.fn() }));
jest.mock('../services/firebase/firebaseEvents', () => ({
  subscribeToEventsByStepId: jest.fn(() => jest.fn()),
}));

const step = {
  id: 'step-1',
  userId: 'user-1',
  goalId: 'goal-1',
  title: 'Choose a race date',
  description: 'Pick a local event.',
  starter: 'Search race calendars',
  estimatedFinishDate: new Date(2026, 8, 10),
  order: 0,
  status: 'pending' as const,
  completedAt: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
};

const goal: GoalWithSteps = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Run a 10k',
  description: 'Build an eight-week training block.',
  smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
  estimatedCompletionDate: new Date(2026, 9, 1),
  nextStepId: step.id,
  status: 'active',
  isAiAssisted: false,
  aiPlanVersion: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
  steps: [step],
  nextStep: step,
  completedStepCount: 0,
  totalStepCount: 1,
  progressText: '0 of 1 steps completed',
};

const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Book the race',
  description: 'Choose and register for the event.',
  goalId: 'goal-1',
  stepId: 'step-1',
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
  (useGoalStepEvents as jest.MockedFunction<typeof useGoalStepEvents>).mockReturnValue({
    events: [],
    uiState: 'idle',
  });
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [goal],
    uiState: 'ready',
    createGoal: jest.fn(async () => undefined),
    updateGoal: jest.fn(async () => undefined),
    markGoalCompleted: jest.fn(async () => undefined),
    createStep: jest.fn(async () => undefined),
    deleteStep: jest.fn(async () => undefined),
    updateStep: jest.fn(async () => undefined),
    reorderSteps: jest.fn(async () => undefined),
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

  it('creates a task with the goal and next-step context', async () => {
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
        goalId: 'goal-1',
        stepId: 'step-1',
      });
    });
  });

  it('switches to the operational timeline and shows linked task counts', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'timeline' } }} />);

    expect(screen.getAllByText('Timeline')).toHaveLength(2);
    expect(screen.getByText('Current · 1 task')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open step Choose a race date' })).toBeTruthy();
  });
});
