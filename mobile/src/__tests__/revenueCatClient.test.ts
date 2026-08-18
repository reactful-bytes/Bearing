import { describe, expect, it } from '@jest/globals';

import { getWebSubscriptionManagementUrl } from '../services/purchases/revenueCatClient';

describe('web subscription management', () => {
  it('routes Apple subscriptions to Apple account management', () => {
    expect(getWebSubscriptionManagementUrl('ios')).toBe(
      'https://apps.apple.com/account/subscriptions',
    );
  });

  it('routes Android subscriptions to Google Play account management', () => {
    expect(getWebSubscriptionManagementUrl('android')).toBe(
      'https://play.google.com/store/account/subscriptions',
    );
  });

  it('does not offer cancellation when the originating store is unknown', () => {
    expect(getWebSubscriptionManagementUrl('web')).toBeNull();
    expect(getWebSubscriptionManagementUrl(null)).toBeNull();
  });
});
