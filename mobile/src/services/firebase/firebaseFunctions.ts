import { Functions, getFunctions } from 'firebase/functions';

import { getFirebaseApp } from './firebaseApp';

let cachedFunctions: Functions | null = null;

export function getFirebaseFunctions(): Functions {
  if (!cachedFunctions) {
    cachedFunctions = getFunctions(getFirebaseApp(), 'us-central1');
  }

  return cachedFunctions;
}
