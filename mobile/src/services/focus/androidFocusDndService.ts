import { NativeModules, Platform } from 'react-native';

export type AndroidDndNativeModule = {
  isPolicyAccessGranted(): Promise<boolean>;
  openPolicyAccessSettings(): Promise<void>;
  beginPriorityMode(): Promise<boolean>;
  endPriorityMode(): Promise<boolean>;
};

export type FocusDndService = {
  isAvailable: boolean;
  hasPolicyAccess(): Promise<boolean>;
  openPolicyAccessSettings(): Promise<void>;
  beginPriorityMode(): Promise<boolean>;
  endPriorityMode(): Promise<boolean>;
};

export function createFocusDndService(
  platform: string = Platform.OS,
  nativeModule: AndroidDndNativeModule | undefined = NativeModules.BearingDnd,
): FocusDndService {
  const isAvailable = platform === 'android' && nativeModule != null;

  return {
    isAvailable,
    hasPolicyAccess: () =>
      isAvailable ? nativeModule.isPolicyAccessGranted() : Promise.resolve(false),
    openPolicyAccessSettings: () =>
      isAvailable ? nativeModule.openPolicyAccessSettings() : Promise.resolve(),
    beginPriorityMode: () =>
      isAvailable ? nativeModule.beginPriorityMode() : Promise.resolve(false),
    endPriorityMode: () => (isAvailable ? nativeModule.endPriorityMode() : Promise.resolve(false)),
  };
}

export const androidFocusDndService = createFocusDndService();
