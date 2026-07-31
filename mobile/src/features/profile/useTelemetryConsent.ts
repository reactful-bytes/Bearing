import { useCallback, useEffect, useState } from 'react';

import { loadTelemetryConsent, saveTelemetryConsent } from '../../services/telemetry/telemetry';

export type UseTelemetryConsentReturn = {
  enabled: boolean;
  pending: boolean;
  error: string | null;
  updateConsent: (enabled: boolean) => Promise<void>;
};

export function useTelemetryConsent(userId: string | null): UseTelemetryConsentReturn {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setEnabled(false);
      setError(null);
      setPending(false);
      return;
    }

    let canceled = false;
    setEnabled(false);
    setError(null);
    setPending(true);
    void loadTelemetryConsent(userId)
      .then((storedConsent) => {
        if (!canceled) setEnabled(storedConsent);
      })
      .catch(() => {
        if (!canceled) setError('Unable to load the diagnostics preference.');
      })
      .finally(() => {
        if (!canceled) setPending(false);
      });
    return () => {
      canceled = true;
    };
  }, [userId]);

  const updateConsent = useCallback(
    async (nextEnabled: boolean): Promise<void> => {
      if (!userId) return;
      setPending(true);
      setError(null);
      try {
        await saveTelemetryConsent(userId, nextEnabled);
        setEnabled(nextEnabled);
      } catch {
        setError('Unable to save the diagnostics preference.');
      } finally {
        setPending(false);
      }
    },
    [userId],
  );

  return { enabled, pending, error, updateConsent };
}
