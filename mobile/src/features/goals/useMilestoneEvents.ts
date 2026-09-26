import { useEffect, useState } from 'react';

import { CalendarEvent } from '../calendar/calendarTypes';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import { subscribeToEventsByMilestoneId } from '../../services/firebase/firebaseEvents';

export type MilestoneEventsUiState = 'idle' | 'loading' | 'error' | 'empty' | 'ready';

export function useMilestoneEvents(milestoneId: string | null): {
  events: CalendarEvent[];
  uiState: MilestoneEventsUiState;
} {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [uiState, setUiState] = useState<MilestoneEventsUiState>('idle');

  useEffect(() => {
    if (!milestoneId) {
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
    return subscribeToEventsByMilestoneId(
      userId,
      milestoneId,
      (fetchedEvents) => {
        setEvents(fetchedEvents);
        setUiState(fetchedEvents.length === 0 ? 'empty' : 'ready');
      },
      () => {
        setEvents([]);
        setUiState('error');
      },
    );
  }, [milestoneId]);

  return { events, uiState };
}
