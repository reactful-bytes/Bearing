import { useEffect, useState } from 'react';

import { subscribeToPremiumEntitlement } from '../../services/firebase/firebaseSubscriptions';
import { PremiumEntitlementRecord, PremiumEntitlementUiState } from './premiumTypes';
import {
  getPremiumDebugAccessMode,
  getPremiumDebugEntitlement,
  isPremiumDebugEnabled,
  subscribeToPremiumDebugAccess,
} from './premiumDebug';

export type UsePremiumEntitlementReturn = {
  entitlement: PremiumEntitlementRecord | null;
  uiState: PremiumEntitlementUiState;
  error: Error | null;
};

function expireEntitlementIfNeeded(
  entitlement: PremiumEntitlementRecord | null,
): PremiumEntitlementRecord | null {
  if (
    entitlement &&
    (entitlement.status === 'active' || entitlement.status === 'in_grace_period') &&
    entitlement.periodEndAt &&
    entitlement.periodEndAt.getTime() <= Date.now()
  ) {
    return { ...entitlement, status: 'expired' };
  }
  return entitlement;
}

export function usePremiumEntitlement(userId: string | null): UsePremiumEntitlementReturn {
  const [entitlement, setEntitlement] = useState<PremiumEntitlementRecord | null>(null);
  const [uiState, setUiState] = useState<PremiumEntitlementUiState>('loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setEntitlement(null);
    setError(null);

    if (!userId) {
      setUiState('ready');
      return;
    }

    const currentUserId = userId;
    setUiState('loading');
    let active = true;
    let storeEntitlement: PremiumEntitlementRecord | null = null;

    function updateEntitlement(): void {
      if (!active) return;
      const debugAccessMode = isPremiumDebugEnabled() ? getPremiumDebugAccessMode() : 'revenuecat';
      const nextEntitlement =
        debugAccessMode === 'free'
          ? null
          : debugAccessMode === 'premium'
            ? getPremiumDebugEntitlement(currentUserId)
            : storeEntitlement;
      setEntitlement(expireEntitlementIfNeeded(nextEntitlement));
    }

    const unsubscribeDebug = isPremiumDebugEnabled()
      ? subscribeToPremiumDebugAccess(updateEntitlement)
      : undefined;

    const unsubscribeEntitlement = subscribeToPremiumEntitlement(
      currentUserId,
      (nextEntitlement) => {
        storeEntitlement = nextEntitlement;
        updateEntitlement();
        setUiState('ready');
        setError(null);
      },
      (subscriptionError) => {
        if (isPremiumDebugEnabled() && getPremiumDebugAccessMode() === 'free') {
          setEntitlement(null);
          setUiState('ready');
          setError(null);
          return;
        }
        const debugEntitlement = isPremiumDebugEnabled()
          ? getPremiumDebugEntitlement(currentUserId)
          : null;
        setEntitlement(debugEntitlement);
        setUiState(debugEntitlement ? 'ready' : 'error');
        setError(debugEntitlement ? null : subscriptionError);
      },
    );

    return () => {
      active = false;
      unsubscribeEntitlement();
      unsubscribeDebug?.();
    };
  }, [userId]);

  useEffect(() => {
    if (
      !entitlement ||
      (entitlement.status !== 'active' && entitlement.status !== 'in_grace_period') ||
      !entitlement.periodEndAt
    ) {
      return;
    }

    const periodEndAt = entitlement.periodEndAt.getTime();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function checkExpiry(): void {
      const remaining = periodEndAt - Date.now();
      if (remaining <= 0) {
        setEntitlement(expireEntitlementIfNeeded);
        return;
      }
      timeout = setTimeout(checkExpiry, Math.min(remaining, 2_147_000_000));
    }

    checkExpiry();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [entitlement]);

  return { entitlement, uiState, error };
}
