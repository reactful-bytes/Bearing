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

    expect(screen.getByRole('radio', { name: 'Select Monthly Premium plan', selected: true })).toBeTruthy();
    expect(screen.getByText('$7.99/mo')).toBeTruthy();
    expect(screen.queryByText('Choose Monthly')).toBeNull();

    fireEvent.press(screen.getByRole('radio', { name: 'Select Yearly Premium plan' }));
    expect(screen.getByRole('radio', { name: 'Select Yearly Premium plan', selected: true })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Yearly Premium plan' }));

    expect(screen.getByRole('header', { name: 'Confirm Premium' })).toBeTruthy();
    expect(screen.getByText('Yearly')).toBeTruthy();
    expect(screen.getByText('$59.99/yr')).toBeTruthy();
    expect(screen.getByText('Only $5.00/mo')).toBeTruthy();
    expect(screen.queryByText('$rc_annual')).toBeNull();
    expect(screen.queryByText('P1Y')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue to the store for Yearly Premium' }));
    });

    expect(purchasePlan).toHaveBeenCalledWith(annualPlan);
  });
});