import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { PremiumPlan } from '../features/premium/purchaseTypes';
import { usePremiumPurchase } from '../features/premium/usePremiumPurchase';

jest.mock('../features/premium/usePremiumPurchase', () => ({
  usePremiumPurchase: jest.fn(),
}));

jest.mock('../services/telemetry/telemetry', () => ({
  recordTelemetryEvent: jest.fn(),
}));

const monthlyPlan: PremiumPlan = {
  packageIdentifier: '$rc_monthly',
  telemetryPlanType: 'MONTHLY',
  title: 'Monthly',
  priceText: '$7.99',
  priceSuffixText: '/mo',
  annualMonthlyBreakdownText: null,
  introductoryOfferText: '1 week free',
  isAutoRenewing: true,
  isOneTimePurchase: false,
};

const annualPlan: PremiumPlan = {
  packageIdentifier: '$rc_annual',
  telemetryPlanType: 'ANNUAL',
  title: 'Yearly',
  priceText: '$59.99',
  priceSuffixText: '/yr',
  annualMonthlyBreakdownText: 'Only $5.00/mo',
  introductoryOfferText: null,
  isAutoRenewing: true,
  isOneTimePurchase: false,
};

describe('PremiumPaywallModal', () => {
  it('selects a plan before showing a customer-facing purchase confirmation', async () => {
    const purchasePlan = jest.fn(async () => undefined);
    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan, annualPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: null,
      purchase: purchasePlan,
      restore: jest.fn(async () => undefined),
    });

    render(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('radio', { name: 'Select Monthly Premium plan', selected: true }),
    ).toBeTruthy();
    expect(screen.getByText('$7.99/mo')).toBeTruthy();
    expect(screen.queryByText('Choose Monthly')).toBeNull();

    fireEvent.press(screen.getByRole('radio', { name: 'Select Yearly Premium plan' }));
    expect(
      screen.getByRole('radio', { name: 'Select Yearly Premium plan', selected: true }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Yearly Premium plan' }));

    expect(screen.getByRole('header', { name: 'Confirm Premium' })).toBeTruthy();
    expect(screen.getByText('Yearly')).toBeTruthy();
    expect(screen.getByText('$59.99/yr')).toBeTruthy();
    expect(screen.getByText('Only $5.00/mo')).toBeTruthy();
    expect(screen.queryByText('$rc_annual')).toBeNull();
    expect(screen.queryByText('P1Y')).toBeNull();

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Continue to the store for Yearly Premium' }),
      );
    });

    expect(purchasePlan).toHaveBeenCalledWith(annualPlan);
  });

  it('uses a compact transaction modal and closes the paywall after a named purchase result', () => {
    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: null,
      purchase: jest.fn(async () => undefined),
      restore: jest.fn(async () => undefined),
    });

    const onClose = jest.fn();
    const { rerender } = render(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Monthly Premium plan' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Continue to the store for Monthly Premium' }),
    );

    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: true,
      error: null,
      feedback: null,
      purchase: jest.fn(async () => undefined),
      restore: jest.fn(async () => undefined),
    });
    rerender(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Activating Premium')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Select Monthly Premium plan' })).toBeNull();
    expect(screen.getByText('Selected plan')).toBeTruthy();
    expect(screen.getByText('$7.99/mo')).toBeTruthy();

    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: 'Premium is active on this account.',
      purchase: jest.fn(async () => undefined),
      restore: jest.fn(async () => undefined),
    });
    rerender(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Monthly Premium is active')).toBeTruthy();
    expect(screen.getByText('Premium is active on this account.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close Premium' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('waits for an accepted re-subscription to replace a prior expired entitlement', () => {
    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: null,
      purchase: jest.fn(async () => undefined),
      restore: jest.fn(async () => undefined),
    });

    const { rerender } = render(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Monthly Premium plan' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Continue to the store for Monthly Premium' }),
    );

    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: true,
      error: null,
      feedback: null,
      purchase: jest.fn(async () => undefined),
      restore: jest.fn(async () => undefined),
    });
    rerender(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Activating Premium')).toBeTruthy();
    expect(screen.queryByText('Purchase not completed')).toBeNull();
  });

  it('does not show stale purchase feedback beneath the re-subscription plans', () => {
    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: 'Premium is active on this account.',
      purchase: jest.fn(async () => undefined),
      restore: jest.fn(async () => undefined),
    });

    render(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Select Monthly Premium plan' })).toBeTruthy();
    expect(screen.queryByText('Premium is active on this account.')).toBeNull();
  });
});
