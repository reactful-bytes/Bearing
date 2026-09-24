import { describe, expect, it } from '@jest/globals';

import {
  buildGoalProgressText,
  composeGoalWithTasks,
  deriveGoalStatus,
  getFirstIncompleteTask,
  normalizeGoalTasks,
} from '../features/goals/goalHelpers';
import { GoalRecord } from '../features/goals/goalTypes';
import { TaskRecord } from '../features/tasks/taskTypes';

function makeGoal(overrides: Partial<GoalRecord> = {}): GoalRecord {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Run a 10k',
    description: 'Build up endurance over eight weeks.',
    smartMeta: {
      specific: 'Run a 10k race',
      measurable: 'Finish the race',
      achievable: 'Train four times a week',
      relevant: 'Improve health',
      timeBound: 'By October 1',
    },
    estimatedCompletionDate: new Date(2026, 8, 1),
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    userId: 'user-1',
    goalId: 'goal-1',
    title: 'Buy running shoes',
    description: 'Pick up a supportive pair.',
    starter: 'Research two stores',
    dueDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    allDay: false,
    order: 0,
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: new Date(2026, 6, 20, 9, 0, 0),
    updatedAt: new Date(2026, 6, 20, 9, 0, 0),
    ...overrides,
  };
}

describe('goalHelpers', () => {
  it('normalizes task order before deriving the next task', () => {
    const tasks = [
      makeTask({ id: 'task-2', order: 5, title: 'Week two run' }),
      makeTask({ id: 'task-1', order: 3, title: 'Week one run', status: 'completed' }),
      makeTask({ id: 'task-3', order: 1, title: 'Buy shoes' }),
    ];

    const normalized = normalizeGoalTasks(tasks);

    expect(normalized.map((task) => task.order)).toEqual([0, 1, 2]);
    expect(getFirstIncompleteTask(normalized)?.id).toBe('task-3');
  });

  it('derives completed status when every task is complete', () => {
    const tasks = [
      makeTask({ id: 'task-1', status: 'completed' }),
      makeTask({ id: 'task-2', order: 1, status: 'completed' }),
    ];

    expect(deriveGoalStatus('active', tasks)).toBe('completed');
  });

  it('preserves manual completion once a goal is completed', () => {
    const tasks = [makeTask()];

    expect(deriveGoalStatus('completed', tasks)).toBe('completed');
  });

  it('builds progress text and omits next task for completed goals', () => {
    const goal = makeGoal({ status: 'completed' });
    const tasks = [
      makeTask({ id: 'task-1', status: 'completed' }),
      makeTask({ id: 'task-2', order: 1, status: 'completed' }),
    ];

    const composed = composeGoalWithTasks(goal, tasks);

    expect(composed.nextTask).toBeNull();
    expect(composed.progressText).toBe('2 of 2 tasks completed');
    expect(buildGoalProgressText(tasks)).toBe('2 of 2 tasks completed');
  });

  it('derives operational progress from goal tasks, not AI milestone metadata', () => {
    const goal = makeGoal({
      isAiAssisted: true,
      aiPlanVersion: 1,
      aiMilestones: [{ title: 'Ignored for progress', description: '' }],
    });
    const task = makeTask({
      status: 'completed',
      completedAt: new Date('2026-07-31T10:00:00.000Z'),
      updatedAt: new Date('2026-07-31T10:00:00.000Z'),
    });

    const composed = composeGoalWithTasks(goal, [task]);

    expect(composed.progressText).toBe('1 of 1 tasks completed');
    expect(composed.nextTask).toBeNull();
    expect(composed.totalTaskCount).toBe(1);
  });
});
