import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';

export type AuthBootstrapStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type AuthBootstrapSnapshot = {
  status: AuthBootstrapStatus;
  user: User | null;
  error: Error | null;
};

export type AuthBootstrapState = AuthBootstrapSnapshot & {
  retry: () => void;
};

export function useAuthBootstrap(): AuthBootstrapState {
  const [state, setState] = useState<AuthBootstrapSnapshot>({
    status: 'loading',
    user: null,
    error: null,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();

      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setState({
            status: user ? 'authenticated' : 'unauthenticated',
            user,
            error: null,
          });
        },
        (error) => {
          setState({
            status: 'error',
            user: null,
            error,
          });
        },
      );

      return unsubscribe;
    } catch (error) {
      setState({
        status: 'error',
        user: null,
        error: error instanceof Error ? error : new Error('Unknown auth bootstrap error.'),
      });

      return () => {};
    }
  }, [revision]);

  const retry = useCallback(() => {
    setState({ status: 'loading', user: null, error: null });
    setRevision((current) => current + 1);
  }, []);

  return { ...state, retry };
}
