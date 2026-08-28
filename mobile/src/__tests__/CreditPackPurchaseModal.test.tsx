import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CreditPackPurchaseModal } from '../components/premium/CreditPackPurchaseModal';
import { getAiCreditStatus } from '../services/firebase/firebaseAiGoalPlans';
import {
  getPremiumPurchaseAvailability,
  loadCreditPacks,
  purchaseCreditPack,
} from '../services/purchases/revenueCatClient';

jest.mock('../services/firebase/firebaseAiGoalPlans', () => ({
  getAiCreditStatus: jest.fn(),
}));

jest.mock('../services/purchases/revenueCatClient', () => ({
  getPremiumPurchaseAvailability: jest.fn(),
  loadCreditPacks: jest.fn(),
  purchaseCreditPack: jest.fn(),
}));

jest.mock('../services/telemetry/telemetry', () => ({
  recordTelemetryEvent: jest.fn(async () => 'disabled'),
}));

const creditPack = {
  packageIdentifier: 'credits_12',
  amount: 12,
  currencyCode: 'AIC',
  priceText: '$6.49',
};

function renderModal(
  overrides: Partial<React.ComponentProps<typeof CreditPackPurchaseModal>> = {},
) {
  const props: React.ComponentProps<typeof CreditPackPurchaseModal> = {
    visible: true,
    userId: 'user-1',
    enabled: true,
    source: 'profile',
    currentBalance: 3,
    onBalanceUpdated: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  render(<CreditPackPurchaseModal {...props} />);
  return props;
}

describe('CreditPackPurchaseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPremiumPurchaseAvailability).mockReturnValue('available');
    jest.mocked(loadCreditPacks).mockResolvedValue([creditPack]);
    jest.mocked(purchaseCreditPack).mockResolvedValue('success');
    jest.mocked(getAiCreditStatus).mockResolvedValue({ eligible: true, availableCredits: 15 });
  });

  it('shows accurate unsupported guidance without loading packs', () => {
    jest.mocked(getPremiumPurchaseAvailability).mockReturnValue('web');

    renderModal();

    expect(
      screen.getByText('AI credit packs are available in the iOS and Android apps.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select a credit pack' })).toBeDisabled();
    expect(loadCreditPacks).not.toHaveBeenCalled();
  });

  it('shows the member catalog amount and price, confirms, and refreshes the authoritative balance', async () => {
    const props = renderModal();

    expect(await screen.findByText('12 AI planning credits')).toBeTruthy();
    expect(screen.getByText('$6.49')).toBeTruthy();
    expect(screen.getByText('3 AI planning credits available')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Continue with 12 AI credits' }));
    expect(screen.getByText('You are selecting')).toBeTruthy();
    expect(screen.getByText('One-time credit pack')).toBeTruthy();
    expect(screen.getByText('This is a one-time purchase and does not renew automatically.'))
      .toBeTruthy();

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Continue to the store for 12 AI credits' }),
      );
    });

    expect(purchaseCreditPack).toHaveBeenCalledWith('user-1', 'credits_12');
    expect(getAiCreditStatus).toHaveBeenCalledTimes(1);
    expect(props.onBalanceUpdated).toHaveBeenCalledWith(15);
    expect(screen.getByText('15 AI planning credits available.')).toBeTruthy();
    expect(screen.getByText('AI credits added')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close credit pack purchase' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(purchaseCreditPack).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with 12 AI credits' }));
    expect(
      screen.getByRole('button', { name: 'Continue to the store for 12 AI credits' }),
    ).toBeTruthy();
  });

  it('shows the completing state while the store purchase is pending', async () => {
    let resolvePurchase: (result: 'success') => void = () => undefined;
    jest.mocked(purchaseCreditPack).mockImplementation(
      () => new Promise((resolve) => (resolvePurchase = resolve)),
    );
    renderModal();

    await screen.findByText('12 AI planning credits');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with 12 AI credits' }));

    act(() => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Continue to the store for 12 AI credits' }),
      );
    });

    expect(screen.getByText('Confirming purchase')).toBeTruthy();
    expect(screen.getByLabelText('Completing credit pack purchase')).toBeTruthy();

    await act(async () => {
      resolvePurchase('success');
    });
  });

  it('clears the pending state when the purchase client throws', async () => {
    jest.mocked(purchaseCreditPack).mockRejectedValueOnce(new Error('client unavailable'));
    renderModal();

    await screen.findByText('12 AI planning credits');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with 12 AI credits' }));

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Continue to the store for 12 AI credits' }),
      );
    });

    await waitFor(() => expect(screen.getByText('Purchase not completed')).toBeTruthy());
    expect(
      screen.getByText('Unable to start the credit pack purchase. Please try again.'),
    ).toBeTruthy();
    expect(getAiCreditStatus).not.toHaveBeenCalled();
  });
});
