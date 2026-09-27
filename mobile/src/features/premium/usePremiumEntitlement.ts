import { useEffect, useState } from 'react';

import { subscribeToPremiumEntitlement } from '../../services/firebase/firebaseSubscriptions';
import { PremiumEntitlementRecord, PremiumEntitlementUiState } from './premiumTypes';
import {
  getPremiumDebugEntitlement,
  isPremiumDebugEnabled,
  subscribeToPremiumDebugAccess,
} from './premiumDebug';

export type UsePremiumEntitlementReturn = {
  entitlement: PremiumEntitlementRecord | null;
  uiState: PremiumEntitlementUiState;
  error: Error | null;
};

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
      setEntitlement(
        (isPremiumDebugEnabled() ? getPremiumDebugEntitlement(currentUserId) : null) ??
          storeEntitlement,
      );
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

  return { entitlement, uiState, error };
}
