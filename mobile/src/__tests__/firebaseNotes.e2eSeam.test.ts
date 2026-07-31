import { describe, expect, it } from '@jest/globals';

import {
  resetNotesSubscriptionFailureForTests,
  shouldInjectNotesSubscriptionFailure,
} from '../features/testing/e2eFaults';

describe('Notes E2E recovery seam', () => {
  it('stays disabled unless explicitly requested', () => {
    resetNotesSubscriptionFailureForTests();

    expect(shouldInjectNotesSubscriptionFailure(false)).toBe(false);
  });

  it('is consumed only once', () => {
    resetNotesSubscriptionFailureForTests();

    expect(shouldInjectNotesSubscriptionFailure(true)).toBe(true);
    expect(shouldInjectNotesSubscriptionFailure(true)).toBe(false);
  });
});
