import { describe, expect, it } from '@jest/globals';

import {
  composeGoalWithMilestones,
  deriveGoalStatus,
  deriveMilestoneStatus,
  normalizeGoalMilestones,
} from '../features/goals/goalHelpers';
import { GoalMilestoneRecord, GoalRecord } from '../features/goals/goalTypes';
import { TaskRecord } from '../features/tasks/taskTypes';

function makeGoal(overrides: Partial<GoalRecord> = {}): GoalRecord {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Run a 10k',
    description: 'Build endurance.',
    smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
    estimatedCompletionDate: new Date(2026, 8, 1),
    nextMilestoneId: null,
    manuallyCompletedAt: null,
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    ...overrides,
  };
}

function makeMilestone(overrides: Partial<GoalMilestoneRecord> = {}): GoalMilestoneRecord {
  return {
    id: 'milestone-1',
    userId: 'user-1',
    goalId: 'goal-1',
    title: 'Build weekly distance',
    description: '',
    order: 0,
    estimatedFinishDate: null,
    manuallyCompletedAt: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
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

describe('goalHelpers', () => {
  it('normalizes milestone order', () => {
    const normalized = normalizeGoalMilestones([
      makeMilestone({ id: 'later', order: 5 }),
      makeMilestone({ id: 'first', order: 1 }),
    ]);
    expect(normalized.map((milestone) => milestone.order)).toEqual([0, 1]);
  });

  it('derives pending, in-progress, and completed status from task counts', () => {
    expect(deriveMilestoneStatus(makeMilestone(), [])).toBe('pending');
    expect(deriveMilestoneStatus(makeMilestone(), [makeTask()])).toBe('pending');
    expect(
      deriveMilestoneStatus(makeMilestone(), [
        makeTask({ status: 'completed' }),
        makeTask({ id: 'task-2' }),
      ]),
    ).toBe('in_progress');
    expect(deriveMilestoneStatus(makeMilestone(), [makeTask({ status: 'completed' })])).toBe(
      'completed',
    );
  });

  it('keeps manual milestone completion sticky while preserving task progress', () => {
    const milestone = makeMilestone({ manuallyCompletedAt: new Date() });
    const composed = composeGoalWithMilestones(makeGoal(), [milestone], [makeTask()]);
    expect(composed.milestones[0].status).toBe('completed');
    expect(composed.milestones[0].progressPercent).toBe(0);
    expect(composed.milestones[0].progressText).toBe('0 of 1 tasks');
  });

  it('completes a goal only when all milestones complete, and derived completion regresses', () => {
    const first = makeMilestone({ id: 'one', order: 0 });
    const second = makeMilestone({ id: 'two', order: 1 });
    const completedTasks = [
      makeTask({ id: 'task-one', milestoneId: 'one', status: 'completed' }),
      makeTask({ id: 'task-two', milestoneId: 'two', status: 'completed' }),
    ];
    const complete = composeGoalWithMilestones(makeGoal(), [first, second], completedTasks);
    expect(complete.status).toBe('completed');
    expect(complete.completedMilestoneCount).toBe(2);
    expect(complete.nextMilestone).toBeNull();
    const regressed = composeGoalWithMilestones(
      makeGoal(),
      [first, second],
      [...completedTasks, makeTask({ id: 'new-task', milestoneId: 'one', status: 'active' })],
    );
    expect(regressed.status).toBe('active');
  });

  it('preserves manual and archived goal completion', () => {
    const milestone = makeMilestone();
    const task = makeTask();
    expect(
      deriveGoalStatus(makeGoal({ manuallyCompletedAt: new Date() }), [milestone], new Map()),
    ).toBe('completed');
    expect(deriveGoalStatus(makeGoal({ status: 'archived' }), [milestone], new Map())).toBe(
      'archived',
    );
    expect(deriveGoalStatus(makeGoal(), [milestone], new Map([[milestone.id, [task]]]))).toBe(
      'active',
    );
  });
});
