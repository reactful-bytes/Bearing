import { describe, expect, it } from '@jest/globals';

import {
  getPremiumEntitlementLabel,
  hasActivePremiumStatus,
} from '../features/premium/premiumAccess';

describe('premium access', () => {
  it.each(['active', 'in_grace_period'] as const)('unlocks access for %s', (status) => {
    expect(hasActivePremiumStatus(status)).toBe(true);
  });

  it.each(['expired', 'canceled', null, undefined] as const)(
    'keeps access locked for %s',
    (status) => {
      expect(hasActivePremiumStatus(status)).toBe(false);
    },
  );

  it('expires active access when its period end has passed', () => {
    const now = new Date('2026-10-05T12:00:00.000Z');

    expect(hasActivePremiumStatus('active', new Date(now.getTime() + 1), now)).toBe(true);
    expect(hasActivePremiumStatus('active', now, now)).toBe(false);
    expect(hasActivePremiumStatus('in_grace_period', new Date(now.getTime() - 1), now)).toBe(false);
    expect(hasActivePremiumStatus('active', null, now)).toBe(true);
  });

  it('maps authoritative statuses to display labels', () => {
    expect(getPremiumEntitlementLabel('active')).toBe('Active');
    expect(getPremiumEntitlementLabel('in_grace_period')).toBe('Grace Period');
    expect(getPremiumEntitlementLabel('expired')).toBe('Expired');
    expect(getPremiumEntitlementLabel('canceled')).toBe('Canceled');
    expect(getPremiumEntitlementLabel(null)).toBe('Free');
  });
});
