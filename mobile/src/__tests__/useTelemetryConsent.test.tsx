import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useTelemetryConsent } from '../features/profile/useTelemetryConsent';
import { loadTelemetryConsent, saveTelemetryConsent } from '../services/telemetry/telemetry';

jest.mock('../services/telemetry/telemetry', () => ({
  loadTelemetryConsent: jest.fn(),
  saveTelemetryConsent: jest.fn(),
}));

describe('useTelemetryConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (saveTelemetryConsent as jest.MockedFunction<typeof saveTelemetryConsent>).mockResolvedValue();
  });

  it('resets visible consent while a different account preference loads', async () => {
    const mockedLoad = loadTelemetryConsent as jest.MockedFunction<typeof loadTelemetryConsent>;
    mockedLoad.mockImplementation((userId) =>
      userId === 'user-1' ? Promise.resolve(true) : new Promise<boolean>(() => undefined),
    );
    const { result, rerender, unmount } = renderHook(
      ({ userId }: { userId: string | null }) => useTelemetryConsent(userId),
      { initialProps: { userId: 'user-1' } },
    );

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
      expect(result.current.pending).toBe(false);
    });

    rerender({ userId: 'user-2' });

    expect(result.current.enabled).toBe(false);
    expect(result.current.pending).toBe(true);
    expect(result.current.error).toBeNull();
    unmount();
  });
});
