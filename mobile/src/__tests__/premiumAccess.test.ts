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

  it('maps authoritative statuses to display labels', () => {
    expect(getPremiumEntitlementLabel('active')).toBe('Active');
    expect(getPremiumEntitlementLabel('in_grace_period')).toBe('Grace Period');
    expect(getPremiumEntitlementLabel('expired')).toBe('Expired');
    expect(getPremiumEntitlementLabel('canceled')).toBe('Canceled');
    expect(getPremiumEntitlementLabel(null)).toBe('Free');
  });
});
