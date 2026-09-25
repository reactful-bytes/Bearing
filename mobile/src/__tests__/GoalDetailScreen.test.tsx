import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useUserProfile } from '../features/profile/useUserProfile';
import { GoalWithTasks } from '../features/goals/goalTypes';
import { CompleteTaskInput, CreateTaskInput, TaskRecord } from '../features/tasks/taskTypes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: jest.fn(), navigate: jest.fn() })),
}));
jest.mock('../features/goals/useGoals', () => ({ useGoals: jest.fn() }));
jest.mock('../features/tasks/useTasks', () => ({ useTasks: jest.fn() }));
jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({ useUserProfile: jest.fn() }));

const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Choose a race date',
  description: 'Pick a local event.',
  goalId: 'goal-1',
  starter: 'Search race calendars',
  order: 0,
  dueDate: new Date(2026, 8, 10),
  scheduledStart: null,
  scheduledEnd: null,
  allDay: false,
  status: 'active',
  completionSource: null,
  completedAt: null,
  completedEventId: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
};

const goal: GoalWithTasks = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Run a 10k',
  description: 'Build an eight-week training block.',
  smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
  estimatedCompletionDate: new Date(2026, 9, 1),
  status: 'active',
  isAiAssisted: false,
  aiPlanVersion: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
  tasks: [task],
  nextTask: task,
  completedTaskCount: 0,
  totalTaskCount: 1,
  progressText: '0 of 1 tasks completed',
};

function mockHooks(): jest.MockedFunction<(input: CreateTaskInput) => Promise<void>> {
  const createTask = jest.fn(async (_input: CreateTaskInput) => undefined);
  (useUserProfile as jest.MockedFunction<typeof useUserProfile>).mockReturnValue({
    profile: { locale: 'en-US', timeFormat: '12-hour' },
  } as never);
  (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
    publicationCalendarTitle: null,
    publishEvent: jest.fn(async () => undefined),
  } as never);
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [goal],
    uiState: 'ready',
    createGoal: jest.fn(async () => undefined),
    updateGoal: jest.fn(async () => undefined),
    markGoalCompleted: jest.fn(async () => undefined),
    retry: jest.fn(),
  });
  (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
    tasks: [task],
    uiState: 'ready',
    createTask,
    updateTask: jest.fn(async () => undefined),
    completeTask: jest.fn(async (_id: string, _input: CompleteTaskInput) => undefined),
    convertTaskToEvent: jest.fn(async () => ({
      eventId: 'event-1',
      eventInput: {
        title: task.title,
        description: task.description,
        startAt: new Date(),
        endAt: new Date(Date.now() + 1_800_000),
        timezone: 'UTC',
      },
      created: true,
      goalId: 'goal-1',
    })),
    deleteTask: jest.fn(async () => undefined),
    retry: jest.fn(),
  });

  return createTask;
}

describe('GoalDetailScreen', () => {
  it('renders the next task and opens its task details', () => {
    mockHooks();
    render(<GoalDetailScreen route={{ params: { goalId: goal.id } }} />);

    expect(screen.getAllByText('Choose a race date').length).toBeGreaterThan(0);
    fireEvent.press(screen.getAllByLabelText('Open task Choose a race date')[0]);
    expect(screen.getByText('Task Details')).toBeTruthy();
    expect(screen.getAllByText(/Search race calendars/).length).toBeGreaterThan(0);
  });

  it('preselects the current goal when creating a task', async () => {
    const createTask = mockHooks();
    render(<GoalDetailScreen route={{ params: { goalId: goal.id } }} />);

    fireEvent.press(screen.getAllByRole('button', { name: 'Add task' })[0]);
    expect(screen.getByLabelText('Select task goal')).toHaveTextContent('Run a 10k');

    fireEvent.changeText(screen.getByLabelText('Task title'), 'Register for race day');
    fireEvent.press(screen.getByLabelText('Save task'));

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith({
        title: 'Register for race day',
        description: '',
        starter: '',
        goalId: 'goal-1',
      }),
    );
  });
});
