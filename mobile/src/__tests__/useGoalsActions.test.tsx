import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { useGoals } from '../features/goals/useGoals';
import type { GoalMilestoneRecord, GoalRecord } from '../features/goals/goalTypes';
import type { TaskRecord } from '../features/tasks/taskTypes';

let mockSignedIn = true;
let mockGoalRecords: GoalRecord[] = [];
let mockMilestoneRecords: GoalMilestoneRecord[] = [];
let mockTaskRecords: TaskRecord[] = [];
let mockOnTasks: ((records: TaskRecord[]) => void) | undefined;
const mockDeleteGoal = jest.fn(async (_userId: string, _goalId: string) => undefined);
const mockSetGoalCompletion = jest.fn(
  async (_userId: string, _goalId: string, _completed: boolean) => undefined,
);

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: () => ({ currentUser: mockSignedIn ? { uid: 'user-1' } : null }),
}));
jest.mock('../services/firebase/firebaseGoals', () => ({
  subscribeToGoals: (_userId: string, onNext: (records: GoalRecord[]) => void) => {
    onNext(mockGoalRecords);
    return jest.fn();
  },
  subscribeToMilestones: (_userId: string, onNext: (records: GoalMilestoneRecord[]) => void) => {
    onNext(mockMilestoneRecords);
    return jest.fn();
  },
  deleteGoal: (userId: string, goalId: string) => mockDeleteGoal(userId, goalId),
  setGoalManuallyCompleted: (userId: string, goalId: string, completed: boolean) =>
    mockSetGoalCompletion(userId, goalId, completed),
}));
jest.mock('../services/firebase/firebaseTasks', () => ({
  subscribeToTasks: (_userId: string, onNext: (records: TaskRecord[]) => void) => {
    mockOnTasks = onNext;
    onNext(mockTaskRecords);
    return jest.fn();
  },
}));

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    userId: 'user-1',
    title: 'Book race',
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

function publishTasks(records: TaskRecord[]): void {
  if (!mockOnTasks) throw new Error('Task subscription has not started.');
  mockTaskRecords = records;
  mockOnTasks(records);
}

describe('goal lifecycle actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignedIn = true;
    mockTaskRecords = [];
    mockOnTasks = undefined;
    mockGoalRecords = [
      {
        id: 'goal-1',
        userId: 'user-1',
        title: 'Run a 10k',
        description: '',
        smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
        estimatedCompletionDate: new Date(2030, 9, 1),
        nextMilestoneId: 'milestone-1',
        manuallyCompletedAt: null,
        status: 'active',
        isAiAssisted: false,
        aiPlanVersion: null,
        createdAt: new Date(2026, 6, 20),
        updatedAt: new Date(2026, 6, 20),
      },
    ];
    mockMilestoneRecords = [
      {
        id: 'milestone-1',
        userId: 'user-1',
        goalId: 'goal-1',
        title: 'Choose a race',
        description: '',
        estimatedFinishDate: null,
        order: 0,
        manuallyCompletedAt: null,
        createdAt: new Date(2026, 6, 20),
        updatedAt: new Date(2026, 6, 20),
      },
    ];
  });

  it('delegates deletion using the authenticated user and goal ID', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.uiState).toBe('ready'));
    await act(async () => result.current.deleteGoal('goal-1'));
    expect(mockDeleteGoal).toHaveBeenCalledWith('user-1', 'goal-1');
  });

  it('delegates completion without changing milestone completion', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.uiState).toBe('ready'));
    await act(async () => result.current.setGoalManuallyCompleted('goal-1', true));
    expect(mockSetGoalCompletion).toHaveBeenCalledWith('user-1', 'goal-1', true);
    expect(mockMilestoneRecords[0].manuallyCompletedAt).toBeNull();
  });

  it('allows uncompleting a manually completed goal with an unfinished milestone', async () => {
    mockGoalRecords[0].manuallyCompletedAt = new Date(2026, 9, 5);
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.goals[0].status).toBe('completed'));
    await act(async () => result.current.setGoalManuallyCompleted('goal-1', false));
    expect(mockSetGoalCompletion).toHaveBeenCalledWith('user-1', 'goal-1', false);
  });

  it('allows reopening a manually completed goal without milestones', async () => {
    mockGoalRecords[0].manuallyCompletedAt = new Date(2026, 9, 5);
    mockMilestoneRecords = [];
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.goals[0].status).toBe('completed'));
    await act(async () => result.current.setGoalManuallyCompleted('goal-1', false));
    expect(mockSetGoalCompletion).toHaveBeenCalledWith('user-1', 'goal-1', false);
  });

  it.each([false, true])(
    'explains blocked reopening when every milestone is completed (manual goal: %s)',
    async (manual) => {
      mockGoalRecords[0].manuallyCompletedAt = manual ? new Date(2026, 9, 5) : null;
      mockTaskRecords = [
        makeTask({ status: 'completed', completionSource: 'manual', completedAt: new Date() }),
      ];
      const { result } = renderHook(() => useGoals());
      await waitFor(() => expect(result.current.goals[0].status).toBe('completed'));
      await expect(result.current.setGoalManuallyCompleted('goal-1', false)).rejects.toThrow(
        'Uncomplete a task or add a new milestone before uncompleting this goal.',
      );
      expect(mockSetGoalCompletion).not.toHaveBeenCalled();
    },
  );

  it('updates milestone status, progress, and goal rollups from live task completion snapshots', async () => {
    const activeTask = makeTask();
    const completedTask: TaskRecord = {
      ...activeTask,
      status: 'completed',
      completionSource: 'manual',
      completedAt: new Date(),
    };
    mockMilestoneRecords[0].manuallyCompletedAt = new Date(2026, 9, 5);
    mockTaskRecords = [activeTask];
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.uiState).toBe('ready'));
    expect(result.current.goals[0].milestones[0].status).toBe('pending');
    expect(result.current.goals[0].status).toBe('active');

    act(() => publishTasks([completedTask]));
    expect(result.current.goals[0].milestones[0].status).toBe('completed');
    expect(result.current.goals[0].milestones[0].progressPercent).toBe(100);
    expect(result.current.goals[0].completedMilestoneCount).toBe(1);
    expect(result.current.goals[0].status).toBe('completed');
    expect(result.current.goals[0].nextMilestone).toBeNull();

    act(() => publishTasks([activeTask]));
    expect(result.current.goals[0].milestones[0].status).toBe('pending');
    expect(result.current.goals[0].milestones[0].progressPercent).toBe(0);
    expect(result.current.goals[0].status).toBe('active');
    expect(result.current.goals[0].nextMilestone?.id).toBe('milestone-1');

    act(() => publishTasks([completedTask, makeTask({ id: 'task-2' })]));
    expect(result.current.goals[0].milestones[0].status).toBe('in_progress');
    expect(result.current.goals[0].milestones[0].progressPercent).toBe(50);
    expect(result.current.goals[0].completedMilestoneCount).toBe(0);
    expect(result.current.goals[0].status).toBe('active');
    expect(result.current.goals[0].nextTask?.id).toBe('task-2');

    act(() => publishTasks([]));
    expect(result.current.goals[0].milestones[0].status).toBe('pending');
    expect(result.current.goals[0].milestones[0].totalTaskCount).toBe(0);
    expect(result.current.goals[0].status).toBe('active');
  });

  it('rejects deletion when authentication is unavailable', async () => {
    mockSignedIn = false;
    const { result } = renderHook(() => useGoals());
    await expect(result.current.deleteGoal('goal-1')).rejects.toThrow('User is not authenticated.');
    expect(mockDeleteGoal).not.toHaveBeenCalled();
  });
});
