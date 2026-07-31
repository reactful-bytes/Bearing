import { useEffect, useState } from 'react';

import { subscribeToPremiumEntitlement } from '../../services/firebase/firebaseSubscriptions';
import { PremiumEntitlementRecord, PremiumEntitlementUiState } from './premiumTypes';

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

    setUiState('loading');

    return subscribeToPremiumEntitlement(
      userId,
      (nextEntitlement) => {
        setEntitlement(nextEntitlement);
        setUiState('ready');
        setError(null);
      },
      (subscriptionError) => {
        setEntitlement(null);
        setUiState('error');
        setError(subscriptionError);
      },
    );
  }, [userId]);

  return { entitlement, uiState, error };
}
