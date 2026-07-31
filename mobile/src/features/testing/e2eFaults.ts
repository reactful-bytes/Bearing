let hasInjectedNotesSubscriptionFailure = false;

export function shouldInjectNotesSubscriptionFailure(
  enabled = process.env.EXPO_PUBLIC_E2E_FAIL_NOTES_SUBSCRIBE_ONCE === 'true',
): boolean {
  if (!__DEV__ || !enabled || hasInjectedNotesSubscriptionFailure) {
    return false;
  }

  hasInjectedNotesSubscriptionFailure = true;
  return true;
}

export function resetNotesSubscriptionFailureForTests(): void {
  hasInjectedNotesSubscriptionFailure = false;
}
