import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { PROFILE_SOUND_OPTIONS } from '../../features/profile/profileSounds';

const REGISTRATION_KEY = 'bearing.push.registration';
const INSTALLATION_KEY = 'bearing.push.installation';
const enabledKey = (userId: string) => `bearing.push.enabled.${userId}`;
let registrationTail: Promise<void> = Promise.resolve();
let disablingRequests = 0;

type Registration = { userId: string; deviceId: string };
export type PushPermission = 'unavailable' | 'undetermined' | 'granted' | 'denied';

function readRegistration(value: string): Registration {
  const data: unknown = JSON.parse(value);
  if (
    !data ||
    typeof data !== 'object' ||
    !('userId' in data) ||
    !('deviceId' in data) ||
    typeof data.userId !== 'string' ||
    typeof data.deviceId !== 'string'
  ) {
    throw new Error('Saved notification registration is invalid. Please contact support.');
  }
  return { userId: data.userId, deviceId: data.deviceId };
}

export async function readPushEnabled(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(enabledKey(userId))) === 'true';
}

export async function getPushPermission(request = false): Promise<PushPermission> {
  if (Platform.OS === 'web') return 'unavailable';
  const Device = await import('expo-device');
  if (!Device.isDevice) return 'unavailable';
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android')
    await Promise.all(
      PROFILE_SOUND_OPTIONS.map((sound) =>
        Notifications.setNotificationChannelAsync(`bearing-reminders-${sound.id}-v1`, {
          name: `Bearing reminders - ${sound.label}`,
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: `${sound.id.replaceAll('-', '_')}.wav`,
          bypassDnd: false,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
        }),
      ),
    );
  let permissions = await Notifications.getPermissionsAsync();
  if (request && permissions.status === 'undetermined') {
    permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  }
  return permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ? 'granted'
    : permissions.status === 'undetermined'
      ? 'undetermined'
      : 'denied';
}

export function registerCurrentPushDevice(userId: string): Promise<void> {
  if (disablingRequests > 0) {
    return Promise.reject(new Error('Notification disablement is in progress. Please try again.'));
  }
  const register = () => registerDevice(userId);
  const operation = registrationTail.then(register, register);
  registrationTail = operation;
  return operation;
}

async function registerDevice(userId: string): Promise<void> {
  const { getFirebaseAuth } = await import('../firebase/firebaseAuth');
  if (getFirebaseAuth().currentUser?.uid !== userId)
    throw new Error('Sign in again to enable notifications.');
  if ((await getPushPermission()) !== 'granted')
    throw new Error('Allow notifications in your device settings first.');
  const Notifications = await import('expo-notifications');
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string')
    throw new Error('Push notifications are not configured for this build.');
  let installationId = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (!installationId) {
    installationId = Crypto.randomUUID();
    await AsyncStorage.setItem(INSTALLATION_KEY, installationId);
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (getFirebaseAuth().currentUser?.uid !== userId)
    throw new Error('The account changed while enabling notifications.');
  const { httpsCallable } = await import('firebase/functions');
  const { getFirebaseFunctions } = await import('../firebase/firebaseFunctions');
  const register = httpsCallable<
    { token: string; installationId: string; timezone: string },
    { deviceId: string }
  >(getFirebaseFunctions(), 'registerPushDevice');
  const result = await register({
    token,
    installationId,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  await AsyncStorage.setItem(
    REGISTRATION_KEY,
    JSON.stringify({ userId, deviceId: result.data.deviceId }),
  );
  await AsyncStorage.setItem(enabledKey(userId), 'true');
}

export async function disableCurrentPushDevice(): Promise<void> {
  disablingRequests += 1;
  try {
    // Drain token refreshes before disabling; each registration caller still receives its error.
    await Promise.allSettled([registrationTail]);
    await disableDevice();
  } finally {
    disablingRequests -= 1;
  }
}

async function disableDevice(): Promise<void> {
  const saved = await AsyncStorage.getItem(REGISTRATION_KEY);
  const installationId = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (!saved && !installationId) return;
  const registration = saved ? readRegistration(saved) : null;
  const { getFirebaseAuth } = await import('../firebase/firebaseAuth');
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId || (registration && userId !== registration.userId)) {
    throw new Error('Sign in to the registered account to disable notifications.');
  }
  const { httpsCallable } = await import('firebase/functions');
  const { getFirebaseFunctions } = await import('../firebase/firebaseFunctions');
  const disable = httpsCallable<
    { deviceId: string } | { installationId: string },
    { disabled: true }
  >(getFirebaseFunctions(), 'disablePushDevice');
  if (installationId) await disable({ installationId });
  else if (registration) await disable({ deviceId: registration.deviceId });
  await AsyncStorage.setItem(enabledKey(userId), 'false');
  await AsyncStorage.removeItem(REGISTRATION_KEY);
}

export async function purgePushAccountData(userId: string): Promise<void> {
  const saved = await AsyncStorage.getItem(REGISTRATION_KEY);
  if (saved && readRegistration(saved).userId === userId)
    await AsyncStorage.removeItem(REGISTRATION_KEY);
  await AsyncStorage.removeItem(enabledKey(userId));
}
