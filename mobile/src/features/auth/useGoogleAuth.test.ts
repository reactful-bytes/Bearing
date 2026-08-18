import { describe, expect, it } from '@jest/globals';

import { parseGoogleAuthSessionResult } from './useGoogleAuth';

describe('Google AuthSession results', () => {
  it('normalizes browser cancellation', () => {
    expect(parseGoogleAuthSessionResult({ type: 'cancel' } as never)).toEqual({
      type: 'cancelled',
    });
  });

  it('returns an ID token from a successful response', () => {
    expect(
      parseGoogleAuthSessionResult({
        type: 'success',
        params: { id_token: 'id-token' },
        authentication: null,
      } as never),
    ).toEqual({ type: 'success', idToken: 'id-token', accessToken: null });
  });

  it('rejects a successful response without an ID token', () => {
    expect(() =>
      parseGoogleAuthSessionResult({
        type: 'success',
        params: {},
        authentication: null,
      } as never),
    ).toThrow('Google did not return an ID token');
  });
});