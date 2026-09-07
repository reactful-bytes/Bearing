import { describe, expect, it } from '@jest/globals';

import { composeGoalWithSteps } from './goalHelpers';
import { GoalRecord, GoalStepRecord } from './goalTypes';

const goal: GoalRecord = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Build a steady routine',
  description: '',
  smartMeta: {
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    timeBound: '',
  },
  estimatedCompletionDate: new Date('2026-12-31T00:00:00.000Z'),
  nextStepId: 'step-1',
  status: 'active',
  isAiAssisted: true,
  aiPlanVersion: 1,
  aiMilestones: [{ title: 'Ignored for progress', description: '' }],
  createdAt: new Date('2026-07-31T09:00:00.000Z'),
  updatedAt: new Date('2026-07-31T09:00:00.000Z'),
};

const step: GoalStepRecord = {
  id: 'step-1',
  userId: 'user-1',
  goalId: 'goal-1',
  title: 'Complete the first session',
  description: '',
  starter: '',
  estimatedFinishDate: null,
  order: 0,
  status: 'completed',
  completedAt: new Date('2026-07-31T10:00:00.000Z'),
  createdAt: new Date('2026-07-31T09:00:00.000Z'),
  updatedAt: new Date('2026-07-31T10:00:00.000Z'),
};

describe('composeGoalWithSteps', () => {
  it('derives operational progress from goal steps, not AI milestone metadata', () => {
    const composed = composeGoalWithSteps(goal, [step]);

    expect(composed.progressText).toBe('1 of 1 steps completed');
    expect(composed.nextStep).toBeNull();
    expect(composed.totalStepCount).toBe(1);
  });
});
