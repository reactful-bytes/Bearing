import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  creditAmount: 10,
  title: 'Monthly',
  priceText: '$7.99',
  priceSuffixText: '/mo',
  annualMonthlyBreakdownText: null,
  isAutoRenewing: true,
  isOneTimePurchase: false,
};

const annualPlan: PremiumPlan = {
  packageIdentifier: '$rc_annual',
  telemetryPlanType: 'ANNUAL',
  creditAmount: null,
  title: 'Yearly',
  priceText: '$59.99',
  priceSuffixText: '/yr',
  annualMonthlyBreakdownText: 'Only $5.00/mo',
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

    const { UNSAFE_getByType } = render(
      <PremiumPaywallModal
        visible
        feature="premium_overview"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        fullScreen
        onClose={jest.fn()}
        onOpenLegalDocument={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('radio', { name: 'Select Monthly Bearing 360 plan', selected: true }),
    ).toBeTruthy();
    expect(screen.getByText('$7.99/mo')).toBeTruthy();
    expect(screen.getByText('Includes 10 AI planning credits per month')).toBeTruthy();
    expect(screen.queryByText(/Trial includes|week free/)).toBeNull();
    expect(
      screen.getByText(
        'Use AI to refine your goal into a SMART goal: specific, measurable, achievable, relevant, and time-bound.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'AI uses your goal description and planning context to create dated milestones and practical tasks for you.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Review and edit the AI-generated plan to fit your approach.'),
    ).toBeTruthy();
    expect(
      screen.queryByText('Keep device calendar access available on the free plan.'),
    ).toBeNull();
    expect(screen.queryByText('Choose Monthly')).toBeNull();

    fireEvent.press(screen.getByRole('radio', { name: 'Select Yearly Bearing 360 plan' }));
    expect(
      screen.getByRole('radio', { name: 'Select Yearly Bearing 360 plan', selected: true }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Yearly Bearing 360 plan' }));

    expect(screen.getByRole('header', { name: 'Confirm Bearing 360' })).toBeTruthy();
    expect(UNSAFE_getByType(SafeAreaView).props.edges).toEqual(['top', 'right', 'bottom', 'left']);
    expect(screen.getByText('Yearly')).toBeTruthy();
    expect(screen.getByText('$59.99/yr')).toBeTruthy();
    expect(screen.getByText('Only $5.00/mo')).toBeTruthy();
    expect(screen.queryByText('$rc_annual')).toBeNull();
    expect(screen.queryByText('P1Y')).toBeNull();

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Continue to the store for Yearly Bearing 360' }),
      );
    });

    expect(purchasePlan).toHaveBeenCalledWith(annualPlan);
  });

  it('shows legal documents full screen when the paywall is full screen', () => {
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

    const onOpenLegalDocument = jest.fn();
    render(
      <PremiumPaywallModal
        visible
        feature="ai_goal_builder"
        userId="user-1"
        isAnonymous={false}
        hasPremiumAccess={false}
        fullScreen
        onClose={jest.fn()}
        onOpenLegalDocument={onOpenLegalDocument}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open Privacy Policy' }));

    expect(onOpenLegalDocument).toHaveBeenCalledWith('privacy');
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Monthly Bearing 360 plan' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Continue to the store for Monthly Bearing 360' }),
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    expect(screen.getByText('Activating Bearing 360')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Select Monthly Bearing 360 plan' })).toBeNull();
    expect(screen.getByText('Selected plan')).toBeTruthy();
    expect(screen.getByText('$7.99/mo')).toBeTruthy();

    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [monthlyPlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: 'Bearing 360 is active on this account.',
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    expect(screen.getByText('Monthly Bearing 360 is active')).toBeTruthy();
    expect(screen.getByText('Bearing 360 is active on this account.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close Bearing 360' }));
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Monthly Bearing 360 plan' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Continue to the store for Monthly Bearing 360' }),
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    expect(screen.getByText('Activating Bearing 360')).toBeTruthy();
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
      feedback: 'Bearing 360 is active on this account.',
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Select Monthly Bearing 360 plan' })).toBeTruthy();
    expect(screen.queryByText('Bearing 360 is active on this account.')).toBeNull();
  });

  it('does not repeat the brand when the store cadence is unknown', () => {
    const unknownCadencePlan: PremiumPlan = {
      ...monthlyPlan,
      packageIdentifier: 'custom-plan',
      telemetryPlanType: 'CUSTOM',
      title: 'Bearing 360',
      priceSuffixText: null,
    };
    jest.mocked(usePremiumPurchase).mockReturnValue({
      availability: 'available',
      plans: [unknownCadencePlan],
      loading: false,
      pendingAction: null,
      awaitingActivation: false,
      error: null,
      feedback: null,
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
        onOpenLegalDocument={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Select Bearing 360 plan' })).toBeTruthy();
    expect(screen.queryByLabelText(/Bearing 360 Bearing 360/)).toBeNull();
  });
});
