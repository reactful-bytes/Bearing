import { describe, expect, it, jest } from '@jest/globals';

import {
  AndroidDndNativeModule,
  createFocusDndService,
} from '../services/focus/androidFocusDndService';

function makeNativeModule(): jest.Mocked<AndroidDndNativeModule> {
  return {
    isPolicyAccessGranted: jest.fn(async () => true),
    openPolicyAccessSettings: jest.fn(async () => undefined),
    beginPriorityMode: jest.fn(async () => true),
    endPriorityMode: jest.fn(async () => true),
  };
}

describe('androidFocusDndService', () => {
  it('delegates Android priority-only lifecycle to the native module', async () => {
    const nativeModule = makeNativeModule();
    const service = createFocusDndService('android', nativeModule);

    expect(service.isAvailable).toBe(true);
    await expect(service.hasPolicyAccess()).resolves.toBe(true);
    await service.openPolicyAccessSettings();
    await expect(service.beginPriorityMode()).resolves.toBe(true);
    await expect(service.endPriorityMode()).resolves.toBe(true);

    expect(nativeModule.isPolicyAccessGranted).toHaveBeenCalledTimes(1);
    expect(nativeModule.openPolicyAccessSettings).toHaveBeenCalledTimes(1);
    expect(nativeModule.beginPriorityMode).toHaveBeenCalledTimes(1);
    expect(nativeModule.endPriorityMode).toHaveBeenCalledTimes(1);
  });

  it('remains unavailable and does not call Android native APIs on iOS', async () => {
    const nativeModule = makeNativeModule();
    const service = createFocusDndService('ios', nativeModule);

    expect(service.isAvailable).toBe(false);
    await expect(service.hasPolicyAccess()).resolves.toBe(false);
    await expect(service.beginPriorityMode()).resolves.toBe(false);
    await expect(service.endPriorityMode()).resolves.toBe(false);

    expect(nativeModule.isPolicyAccessGranted).not.toHaveBeenCalled();
    expect(nativeModule.beginPriorityMode).not.toHaveBeenCalled();
    expect(nativeModule.endPriorityMode).not.toHaveBeenCalled();
  });
});
