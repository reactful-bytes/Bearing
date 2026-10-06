import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

export function useTaskCompletionAction(
  onComplete: (() => void | Promise<void>) | undefined,
  completed: boolean,
) {
  const workingRef = useRef(false);
  const [working, setWorking] = useState(false);

  const complete = useCallback(async (): Promise<void> => {
    if (!onComplete || completed || workingRef.current) return;
    workingRef.current = true;
    setWorking(true);
    try {
      await onComplete();
    } catch {
      Alert.alert('Unable to complete task', 'Please try again.');
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }, [completed, onComplete]);

  return { complete, working };
}
