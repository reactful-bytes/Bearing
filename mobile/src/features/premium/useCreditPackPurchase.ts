import { useEffect, useState } from 'react';

import { getAiCreditStatus } from '../../services/firebase/firebaseAiGoalPlans';
import {
  getPremiumPurchaseAvailability,
  loadCreditPacks,
  purchaseCreditPack,
} from '../../services/purchases/revenueCatClient';
import { recordTelemetryEvent } from '../../services/telemetry/telemetry';
import { CreditPack, CreditPackSource, PremiumPurchaseAvailability } from './purchaseTypes';

export function useCreditPackPurchase(
  userId: string | null,
  enabled: boolean,
  visible: boolean,
  source: CreditPackSource,
  onBalanceUpdated: (availableCredits: number) => void,
) {
  const [availability] = useState<PremiumPurchaseAvailability>(getPremiumPurchaseAvailability);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingPackageIdentifier, setPendingPackageIdentifier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !enabled || !userId || availability !== 'available') return;

    let current = true;
    setLoading(true);
    setError(null);
    void recordTelemetryEvent('premium_credit_pack_viewed', { source });
    void loadCreditPacks(userId)
      .then((nextPacks) => {
        if (!current) return;
        setPacks(nextPacks);
        if (nextPacks.length === 0) setError('No AI credit packs are available right now.');
      })
      .catch(() => {
        if (current) setError('Unable to load AI credit packs. Please try again.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [availability, enabled, source, userId, visible]);

  async function purchase(pack: CreditPack): Promise<void> {
    if (!userId || !enabled) return;
    setPendingPackageIdentifier(pack.packageIdentifier);
    setError(null);
    setFeedback(null);
    let storePurchaseSucceeded = false;
    try {
      void recordTelemetryEvent('premium_credit_pack_purchase_started', { source });
      const result = await purchaseCreditPack(userId, pack.packageIdentifier);
      void recordTelemetryEvent('premium_credit_pack_purchase_result', { source, outcome: result });

      if (result === 'cancelled') {
        setError('The purchase was canceled.');
      } else if (result === 'failure') {
        setError('The credit pack could not be purchased. Please try again.');
      } else if (result === 'sync_failure') {
        setError(
          'The store accepted the purchase, but the balance could not sync. Check again soon.',
        );
      } else {
        storePurchaseSucceeded = true;
        const status = await getAiCreditStatus();
        onBalanceUpdated(status.availableCredits);
        setFeedback(`${status.availableCredits} AI planning credits available.`);
        void recordTelemetryEvent('premium_credit_pack_balance_refresh_result', {
          source,
          outcome: 'success',
        });
      }
    } catch {
      if (storePurchaseSucceeded) {
        setError('The purchase completed, but the current balance is temporarily unavailable.');
        void recordTelemetryEvent('premium_credit_pack_balance_refresh_result', {
          source,
          outcome: 'failure',
        });
      } else {
        setError('Unable to start the credit pack purchase. Please try again.');
      }
    } finally {
      setPendingPackageIdentifier(null);
    }
  }

  return {
    availability,
    packs,
    loading,
    pendingPackageIdentifier,
    error,
    feedback,
    purchase,
  };
}
