import { useSyncExternalStore } from 'react';

export type FocusSession = {
  eventId: string;
  title: string;
  endAt: Date;
};

let currentSession: FocusSession | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function setFocusSession(session: FocusSession): void {
  if (
    currentSession?.eventId === session.eventId &&
    currentSession.title === session.title &&
    currentSession.endAt.getTime() === session.endAt.getTime()
  ) {
    return;
  }

  currentSession = session;
  emit();
}

export function clearFocusSession(): void {
  if (!currentSession) {
    return;
  }

  currentSession = null;
  emit();
}

export function useFocusSession(): FocusSession | null {
  return useSyncExternalStore(
    subscribe,
    () => currentSession,
    () => null,
  );
}
