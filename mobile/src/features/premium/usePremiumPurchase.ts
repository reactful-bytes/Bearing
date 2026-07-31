import { useEffect, useState } from 'react';

import {
  getPremiumPurchaseAvailability,
  loadPremiumPlans,
  purchasePremiumPlan,
  restorePremiumPurchases,
} from '../../services/purchases/revenueCatClient';
import { recordTelemetryEvent } from '../../services/telemetry/telemetry';
import { PremiumPlan, PremiumPurchaseAvailability } from './purchaseTypes';

type ActivationSource = 'purchase' | 'restore';

export function usePremiumPurchase(
  userId: string | null,
  enabled: boolean,
  visible: boolean,
  hasPremiumAccess: boolean,
) {
  const [availability] = useState<PremiumPurchaseAvailability>(getPremiumPurchaseAvailability);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [activationSource, setActivationSource] = useState<ActivationSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !enabled || !userId || availability !== 'available') return;

    let current = true;
    setLoading(true);
    setError(null);
    void loadPremiumPlans(userId)
      .then((nextPlans) => {
        if (!current) return;
        setPlans(nextPlans);
        if (nextPlans.length === 0) setError('No subscription plans are available right now.');
      })
      .catch(() => {
        if (current) setError('Unable to load subscription plans. Please try again.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [availability, enabled, userId, visible]);

  useEffect(() => {
    if (!activationSource) return;
    if (hasPremiumAccess) {
      void recordTelemetryEvent('premium_activation_result', {
        source: activationSource,
        outcome: 'success',
      });
      setFeedback('Premium is active on this account.');
      setActivationSource(null);
      return;
    }

    const timeout = setTimeout(() => {
      void recordTelemetryEvent('premium_activation_result', {
        source: activationSource,
        outcome: 'delayed',
      });
      setFeedback('The store accepted the request. Premium activation is still syncing.');
      setActivationSource(null);
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [activationSource, hasPremiumAccess]);

  async function purchase(plan: PremiumPlan): Promise<void> {
    if (!userId || !enabled) return;
    setPendingAction(plan.packageIdentifier);
    setError(null);
    setFeedback(null);
    void recordTelemetryEvent('premium_purchase_started', { period: plan.period });
    const result = await purchasePremiumPlan(userId, plan.packageIdentifier);
    void recordTelemetryEvent('premium_purchase_result', { period: plan.period, outcome: result });
    if (result === 'success') {
      setFeedback('Purchase accepted. Activating Premium...');
      setActivationSource('purchase');
    } else if (result === 'failure') {
      setError('The purchase could not be completed. Please try again.');
    }
    setPendingAction(null);
  }

  async function restore(): Promise<void> {
    if (!userId || !enabled) return;
    setPendingAction('restore');
    setError(null);
    setFeedback(null);
    const result = await restorePremiumPurchases(userId);
    void recordTelemetryEvent('premium_restore_result', { outcome: result });
    if (result === 'success') {
      setFeedback('Restore completed. Checking Premium access...');
      setActivationSource('restore');
    } else {
      setError('Purchases could not be restored. Check the store account and try again.');
    }
    setPendingAction(null);
  }

  return {
    availability,
    plans,
    loading,
    pendingAction,
    awaitingActivation: activationSource !== null,
    error,
    feedback,
    purchase,
    restore,
  };
}
