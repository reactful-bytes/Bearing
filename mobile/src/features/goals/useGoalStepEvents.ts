import { useEffect, useState } from 'react';

import { CalendarEvent } from '../calendar/calendarTypes';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import { subscribeToEventsByStepId } from '../../services/firebase/firebaseEvents';

export type GoalStepEventsUiState = 'idle' | 'loading' | 'error' | 'empty' | 'ready';

export function useGoalStepEvents(stepId: string | null): {
  events: CalendarEvent[];
  uiState: GoalStepEventsUiState;
} {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [uiState, setUiState] = useState<GoalStepEventsUiState>('idle');

  useEffect(() => {
    if (!stepId) {
      setEvents([]);
      setUiState('idle');
      return;
    }

    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      setEvents([]);
      setUiState('error');
      return;
    }

    setUiState('loading');

    const unsubscribe = subscribeToEventsByStepId(
      userId,
      stepId,
      (fetchedEvents) => {
        setEvents(fetchedEvents);
        setUiState(fetchedEvents.length === 0 ? 'empty' : 'ready');
      },
      () => {
        setEvents([]);
        setUiState('error');
      },
    );

    return unsubscribe;
  }, [stepId]);

  return { events, uiState };
}
