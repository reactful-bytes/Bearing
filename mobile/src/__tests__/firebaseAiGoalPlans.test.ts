import { describe, expect, it } from '@jest/globals';

import { shouldShowAiGoalPlanProviderSelector } from '../features/goals/aiGoalPlanTypes';
import {
  getAiPlanningErrorCode,
  getAiPlanningErrorDetails,
} from '../services/firebase/aiPlanningErrors';

describe('AI goal-plan callable errors', () => {
  it('extracts the Firebase callable code', () => {
    expect(getAiPlanningErrorCode({ code: 'functions/unavailable' })).toBe('unavailable');
    expect(getAiPlanningErrorCode({ code: 'internal' })).toBe('internal');
    expect(getAiPlanningErrorCode(null)).toBeNull();
  });

  it('maps provider diagnostics to user-friendly guidance without technical details', () => {
    expect(
      getAiPlanningErrorDetails({
        details: {
          provider: 'gemini',
          httpStatus: 503,
          providerMessage: '  Temporary\nservice  unavailable. ',
          requestId: '123e4567-e89b-42d3-a456-426614174000',
        },
      }),
    ).toBe('AI planning is temporarily unavailable. Please try again shortly.');
    expect(
      getAiPlanningErrorDetails({
        details: { provider: 'openai', httpStatus: 503 },
      }),
    ).toBe('AI planning is temporarily unavailable. Please try again shortly.');
  });

  it('only enables provider selection in local development builds', () => {
    expect(shouldShowAiGoalPlanProviderSelector(true, 'development')).toBe(true);
    expect(shouldShowAiGoalPlanProviderSelector(false, 'development')).toBe(false);
    expect(shouldShowAiGoalPlanProviderSelector(true, 'preview')).toBe(false);
    expect(shouldShowAiGoalPlanProviderSelector(true, 'production')).toBe(false);
  });

  it('explains which goal input field failed server validation', () => {
    expect(
      getAiPlanningErrorDetails({
        details: {
          reason: 'goal_plan_input',
          invalidFields: ['title', 'targetDate'],
        },
      }),
    ).toBe(
      'The goal name is missing or exceeds 120 characters. Re-enter the goal name and try again.',
    );
  });

  it('ignores unrecognized diagnostic providers and gives generic guidance for malformed statuses', () => {
    expect(
      getAiPlanningErrorDetails({
        details: { provider: 'other', providerMessage: 'private text' },
      }),
    ).toBeNull();
    expect(
      getAiPlanningErrorDetails({
        details: { provider: 'gemini', httpStatus: '503' },
      }),
    ).toBe('AI planning is unavailable right now. Please try again or continue manually.');
  });
});
