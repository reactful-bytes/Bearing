import { describe, expect, it } from '@jest/globals';

import {
  buildGoalProgressText,
  composeGoalWithSteps,
  deriveGoalStatus,
  getFirstIncompleteStep,
  normalizeGoalSteps,
} from '../features/goals/goalHelpers';
import { GoalRecord, GoalStepRecord } from '../features/goals/goalTypes';

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
    nextStepId: null,
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    createdAt: new Date(2026, 6, 20),
    updatedAt: new Date(2026, 6, 20),
    ...overrides,
  };
}

function makeStep(overrides: Partial<GoalStepRecord> = {}): GoalStepRecord {
  return {
    id: 'step-1',
    userId: 'user-1',
    goalId: 'goal-1',
    title: 'Buy running shoes',
    description: 'Pick up a supportive pair.',
    starter: 'Research two stores',
    estimatedFinishDate: null,
    order: 0,
    status: 'pending',
    completedAt: null,
    createdAt: new Date(2026, 6, 20, 9, 0, 0),
    updatedAt: new Date(2026, 6, 20, 9, 0, 0),
    ...overrides,
  };
}

describe('goalHelpers', () => {
  it('normalizes step order before deriving the next step', () => {
    const steps = [
      makeStep({ id: 'step-2', order: 5, title: 'Week two run' }),
      makeStep({ id: 'step-1', order: 3, title: 'Week one run', status: 'completed' }),
      makeStep({ id: 'step-3', order: 1, title: 'Buy shoes' }),
    ];

    const normalized = normalizeGoalSteps(steps);

    expect(normalized.map((step) => step.order)).toEqual([0, 1, 2]);
    expect(getFirstIncompleteStep(normalized)?.id).toBe('step-3');
  });

  it('derives completed status when every step is complete', () => {
    const steps = [
      makeStep({ id: 'step-1', status: 'completed' }),
      makeStep({ id: 'step-2', order: 1, status: 'completed' }),
    ];

    expect(deriveGoalStatus('active', steps)).toBe('completed');
  });

  it('preserves manual completion once a goal is completed', () => {
    const steps = [makeStep({ status: 'pending' })];

    expect(deriveGoalStatus('completed', steps)).toBe('completed');
  });

  it('builds progress text and omits next step for completed goals', () => {
    const goal = makeGoal({ status: 'completed' });
    const steps = [
      makeStep({ id: 'step-1', status: 'completed' }),
      makeStep({ id: 'step-2', order: 1, status: 'completed' }),
    ];

    const composed = composeGoalWithSteps(goal, steps);

    expect(composed.nextStep).toBeNull();
    expect(composed.progressText).toBe('2 of 2 steps completed');
    expect(buildGoalProgressText(steps)).toBe('2 of 2 steps completed');
  });
});
