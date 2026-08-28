import { useSyncExternalStore } from 'react';

type AiCreditBalanceSnapshot = {
  userId: string | null;
  balance: number | null;
};

let snapshot: AiCreditBalanceSnapshot = { userId: null, balance: null };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AiCreditBalanceSnapshot {
  return snapshot;
}

export function setAiCreditBalance(userId: string, balance: number): void {
  snapshot = { userId, balance };
  listeners.forEach((listener) => listener());
}

export function clearAiCreditBalance(): void {
  if (snapshot.userId === null && snapshot.balance === null) return;
  snapshot = { userId: null, balance: null };
  listeners.forEach((listener) => listener());
}

export function useAiCreditBalance(userId: string | null): number | null {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return current.userId === userId ? current.balance : null;
}