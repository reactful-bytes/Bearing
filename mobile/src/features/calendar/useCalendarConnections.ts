import { useCallback, useEffect, useState } from 'react';

import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  disconnectCalendarConnection as disconnectFirebaseCalendarConnection,
  subscribeToCalendarConnections,
  updateCalendarConnectionCalendars as updateFirebaseCalendarConnectionCalendars,
  updateCalendarConnectionSyncEnabled as updateFirebaseCalendarConnectionSyncEnabled,
} from '../../services/firebase/firebaseCalendarConnections';
import {
  CalendarConnectionRecord,
  CalendarConnectionsUiState,
  ProviderCalendarRecord,
} from './calendarConnectionTypes';

export type UseCalendarConnectionsReturn = {
  connections: CalendarConnectionRecord[];
  uiState: CalendarConnectionsUiState;
  updateConnectionCalendars: (
    connectionId: string,
    calendars: ProviderCalendarRecord[],
  ) => Promise<void>;
  updateConnectionSyncEnabled: (connectionId: string, syncEnabled: boolean) => Promise<void>;
  disconnectConnection: (connectionId: string) => Promise<void>;
};

export function useCalendarConnections(): UseCalendarConnectionsReturn {
  const [connections, setConnections] = useState<CalendarConnectionRecord[]>([]);
  const [uiState, setUiState] = useState<CalendarConnectionsUiState>('loading');

  useEffect(() => {
    const userId = getFirebaseAuth().currentUser?.uid;

    if (!userId) {
      setUiState('error');
      return;
    }

    setUiState('loading');

    const unsubscribe = subscribeToCalendarConnections(
      userId,
      (fetchedConnections) => {
        setConnections(fetchedConnections);
        setUiState(fetchedConnections.length === 0 ? 'empty' : 'ready');
      },
      () => {
        setUiState('error');
      },
    );

    return unsubscribe;
  }, []);

  const updateConnectionCalendars = useCallback(
    async (connectionId: string, calendars: ProviderCalendarRecord[]): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) {
        throw new Error('User is not authenticated.');
      }

      await updateFirebaseCalendarConnectionCalendars(userId, connectionId, calendars);
    },
    [],
  );

  const updateConnectionSyncEnabled = useCallback(
    async (connectionId: string, syncEnabled: boolean): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) {
        throw new Error('User is not authenticated.');
      }

      await updateFirebaseCalendarConnectionSyncEnabled(userId, connectionId, syncEnabled);
    },
    [],
  );

  const disconnectConnection = useCallback(async (connectionId: string): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await disconnectFirebaseCalendarConnection(userId, connectionId);
  }, []);

  return {
    connections,
    uiState,
    updateConnectionCalendars,
    updateConnectionSyncEnabled,
    disconnectConnection,
  };
}
