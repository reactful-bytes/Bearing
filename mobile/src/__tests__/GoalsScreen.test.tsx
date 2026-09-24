import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { GoalsScreen } from '../screens/GoalsScreen';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { useUserProfile } from '../features/profile/useUserProfile';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { GoalWithTasks } from '../features/goals/goalTypes';
import { TaskRecord } from '../features/tasks/taskTypes';

jest.mock('../features/goals/useGoals', () => ({ useGoals: jest.fn() }));
jest.mock('../features/tasks/useTasks', () => ({ useTasks: jest.fn() }));
jest.mock('../features/profile/useUserProfile', () => ({ useUserProfile: jest.fn() }));
jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));
jest.mock('../features/premium/usePremiumEntitlement', () => ({
  usePremiumEntitlement: jest.fn(),
}));
jest.mock('../services/firebase/firebaseAiGoalPlans', () => ({
  generateAiGoalPlanDraft: jest.fn(),
  getAiCreditStatus: jest.fn(),
}));

const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Buy running shoes',
  description: 'Pick a pair for weekly mileage.',
  goalId: 'goal-1',
  starter: 'Check two stores',
  order: 0,
  dueDate: new Date(2026, 7, 25),
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
  estimatedCompletionDate: new Date(2026, 8, 1),
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

function mockHooks(): void {
  (useUserProfile as jest.MockedFunction<typeof useUserProfile>).mockReturnValue({
    authUser: { uid: 'user-1', isAnonymous: false } as never,
    isAnonymous: false,
    profile: { locale: 'en-US', timeFormat: '12-hour' },
  } as never);
  (usePremiumEntitlement as jest.MockedFunction<typeof usePremiumEntitlement>).mockReturnValue({
    entitlement: null,
    uiState: 'ready',
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
    createTask: jest.fn(async () => undefined),
    updateTask: jest.fn(async () => undefined),
    completeTask: jest.fn(async () => undefined),
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
}

describe('GoalsScreen', () => {
  it('renders a goal with its task progress and opens task details', () => {
    mockHooks();
    render(<GoalsScreen />);

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.getByText('Next: Buy running shoes')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open goal Run a 10k'));
    fireEvent.press(screen.getByLabelText('Open task Buy running shoes'));
    expect(screen.getByText('Task Details')).toBeTruthy();
  });
});
