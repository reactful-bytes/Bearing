import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { subscribeToPremiumEntitlement } from '../services/firebase/firebaseSubscriptions';

jest.mock('../services/firebase/firebaseSubscriptions', () => ({
  subscribeToPremiumEntitlement: jest.fn(),
}));

describe('usePremiumEntitlement', () => {
  const mockedSubscribe = subscribeToPremiumEntitlement as jest.MockedFunction<
    typeof subscribeToPremiumEntitlement
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a missing subscription as free access', async () => {
    mockedSubscribe.mockImplementation((_userId, onNext) => {
      onNext(null);
      return jest.fn();
    });

    const { result } = renderHook(() => usePremiumEntitlement('user-1'));

    await waitFor(() => expect(result.current.uiState).toBe('ready'));
    expect(result.current.entitlement).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fails closed when the subscription read fails', async () => {
    const readError = new Error('permission denied');
    mockedSubscribe.mockImplementation((_userId, _onNext, onError) => {
      onError(readError);
      return jest.fn();
    });

    const { result } = renderHook(() => usePremiumEntitlement('user-1'));

    await act(async () => {
      await waitFor(() => expect(result.current.uiState).toBe('error'));
    });
    expect(result.current.entitlement).toBeNull();
    expect(result.current.error).toBe(readError);
  });
});
