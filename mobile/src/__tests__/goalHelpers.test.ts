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

  it.each([
    { tasks: [], status: 'pending', progress: 0 },
    { tasks: [makeTask()], status: 'pending', progress: 0 },
    {
      tasks: [makeTask({ status: 'completed' }), makeTask({ id: 'task-2' })],
      status: 'in_progress',
      progress: 50,
    },
    { tasks: [makeTask({ status: 'completed' })], status: 'completed', progress: 100 },
  ])(
    'ignores legacy manual markers for $status milestones and preserves task progress',
    ({ tasks, status, progress }) => {
      const legacyMarker = new Date(2026, 6, 20);
      const milestone = makeMilestone({ manuallyCompletedAt: legacyMarker });
      const composed = composeGoalWithMilestones(makeGoal(), [milestone], tasks);
      expect(composed.milestones[0].status).toBe(status);
      expect(composed.milestones[0].progressPercent).toBe(progress);
      expect(composed.milestones[0].totalTaskCount).toBe(tasks.length);
      expect(composed.milestones[0].completedTaskCount).toBe(
        tasks.filter((task) => task.status === 'completed').length,
      );
      expect(composed.milestones[0].manuallyCompletedAt).toEqual(legacyMarker);
      expect(composed.status).toBe(status === 'completed' ? 'completed' : 'active');
    },
  );

  it('completes a goal only when all milestones complete, and derived completion regresses', () => {
    const first = makeMilestone({ id: 'one', order: 0, manuallyCompletedAt: new Date() });
    const second = makeMilestone({ id: 'two', order: 1 });
    const completedTasks = [
      makeTask({ id: 'task-one', milestoneId: 'one', status: 'completed' }),
      makeTask({ id: 'task-two', milestoneId: 'two', status: 'completed' }),
    ];
    const complete = composeGoalWithMilestones(makeGoal(), [first, second], completedTasks);
    expect(complete.status).toBe('completed');
    expect(complete.completedMilestoneCount).toBe(2);
    expect(complete.progressText).toBe('2 of 2 tasks completed');
    expect(complete.nextMilestone).toBeNull();
    const regressed = composeGoalWithMilestones(
      makeGoal(),
      [first, second],
      [...completedTasks, makeTask({ id: 'new-task', milestoneId: 'one', status: 'active' })],
    );
    expect(regressed.status).toBe('active');
    expect(regressed.milestones[0].status).toBe('in_progress');
    expect(regressed.milestones[0].progressPercent).toBe(50);
    expect(regressed.completedMilestoneCount).toBe(1);
    expect(regressed.progressText).toBe('2 of 3 tasks completed');
    expect(regressed.nextMilestone?.id).toBe('one');
    const reactivated = composeGoalWithMilestones(
      makeGoal(),
      [first, second],
      [makeTask({ id: 'task-one', milestoneId: 'one' }), completedTasks[1]],
    );
    expect(reactivated.status).toBe('active');
    expect(reactivated.milestones[0].status).toBe('pending');
    expect(reactivated.completedMilestoneCount).toBe(1);
    expect(reactivated.nextMilestone?.id).toBe('one');
  });

  it('summarizes goal progress from all goal tasks, including tasks without milestones', () => {
    const composed = composeGoalWithMilestones(makeGoal(), [], [
      makeTask({ status: 'completed', milestoneId: null }),
      makeTask({ id: 'unassigned-active', milestoneId: null }),
    ]);

    expect(composed.completedTaskCount).toBe(1);
    expect(composed.totalTaskCount).toBe(2);
    expect(composed.progressText).toBe('1 of 2 tasks completed');
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

  it('preserves draft status even when every milestone is complete', () => {
    const composed = composeGoalWithMilestones(
      makeGoal({ status: 'draft' }),
      [makeMilestone()],
      [makeTask({ status: 'completed' })],
    );
    expect(composed.milestones[0].status).toBe('completed');
    expect(composed.status).toBe('draft');
  });

  it('preserves manual goal completion while an unfinished milestone follows its tasks', () => {
    const composed = composeGoalWithMilestones(
      makeGoal({ manuallyCompletedAt: new Date() }),
      [makeMilestone({ manuallyCompletedAt: new Date() })],
      [makeTask()],
    );
    expect(composed.status).toBe('completed');
    expect(composed.milestones[0].status).toBe('pending');
    expect(composed.completedMilestoneCount).toBe(0);
  });
});
