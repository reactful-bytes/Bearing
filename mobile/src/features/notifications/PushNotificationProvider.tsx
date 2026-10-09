import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import {
  disableCurrentPushDevice,
  getPushPermission,
  PushPermission,
  readPushEnabled,
  registerCurrentPushDevice,
} from '../../services/notifications/pushNotifications';
import { getNotificationDestination, NotificationDestination } from './notificationDestination';
import { shouldPresentReminder } from './foregroundNotificationPolicy';

type PushState = {
  enabled: boolean;
  permission: PushPermission;
  pending: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  destination: NotificationDestination | null;
  consumeDestination: () => void;
};

const PushContext = createContext<PushState>({
  enabled: false,
  permission: 'unavailable',
  pending: false,
  error: null,
  enable: async () => {
    throw new Error('Push notifications are unavailable in this environment.');
  },
  disable: async () => {
    throw new Error('Push notifications are unavailable in this environment.');
  },
  destination: null,
  consumeDestination: () => {},
});

export const usePushNotifications = () => useContext(PushContext);
const loadExpoNotifications = () => import('expo-notifications');

export function PushNotificationProvider({
  userId,
  children,
  loadNotifications = loadExpoNotifications,
}: {
  userId: string;
  children: ReactNode;
  loadNotifications?: () => Promise<typeof import('expo-notifications')>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<NotificationDestination | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const handledResponses = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const nextPermission = await getPushPermission();
      const wasEnabled = await readPushEnabled(userId);
      if (wasEnabled && nextPermission === 'granted') await registerCurrentPushDevice(userId);
      else if (wasEnabled) await disableCurrentPushDevice();
      if (mounted.current) {
        setPermission(nextPermission);
        setEnabled(wasEnabled && nextPermission === 'granted');
        setError(null);
      }
    } catch {
      if (mounted.current)
        setError('Unable to refresh push notifications. Check your connection and try again.');
    } finally {
      busy.current = false;
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadNotifications()
      .then((Notifications) => {
        if (disposed) return;
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            const belongsToUser =
              notification.request.content.data?.userId === userId && shouldPresentReminder();
            return {
              shouldShowBanner: belongsToUser,
              shouldShowList: belongsToUser,
              shouldPlaySound: belongsToUser,
              shouldSetBadge: false,
            };
          },
          handleError: () =>
            setError('Unable to display a notification. Please check notification settings.'),
        });
        const handle = (response: import('expo-notifications').NotificationResponse) => {
          const id = response.notification.request.identifier;
          if (handledResponses.current.has(id)) return;
          handledResponses.current.add(id);
          const target = getNotificationDestination(
            response.notification.request.content.data ?? {},
            userId,
          );
          if (target) setDestination(target);
          else if (response.notification.request.content.data?.userId === userId) {
            setError('This notification cannot be opened. View your calendar or tasks instead.');
          }
          Notifications.clearLastNotificationResponse();
        };
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(handle);
        const tokenSubscription = Notifications.addPushTokenListener(() => {
          void refresh();
        });
        const last = Notifications.getLastNotificationResponse();
        if (last) handle(last);
        cleanup = () => {
          responseSubscription.remove();
          tokenSubscription.remove();
          Notifications.setNotificationHandler(null);
        };
      })
      .catch(() => {
        if (!disposed)
          setError(
            'Notifications are unavailable in this build. Install an updated development or production build.',
          );
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [refresh, userId, loadNotifications]);

  async function enable(): Promise<void> {
    if (busy.current) throw new Error('Notification setup is busy. Please try again.');
    if (Platform.OS === 'web' || permission === 'unavailable') {
      throw new Error(
        'Push reminders require a physical Android or iOS device and a native build.',
      );
    }
    busy.current = true;
    setPending(true);
    setError(null);
    let blocked = false;
    try {
      const accepted = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Enable reminders',
          'Allow Bearing to send event reminders and optional goal-task due-date summaries on this device?',
          [
            { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        ),
      );
      if (!accepted)
        throw new Error(
          'Notifications were not enabled. You can save without reminders or try again.',
        );
      const nextPermission = await getPushPermission(true);
      setPermission(nextPermission);
      blocked = nextPermission === 'denied';
      if (nextPermission !== 'granted') {
        throw new Error(
          nextPermission === 'unavailable'
            ? 'Push reminders require a physical Android or iOS device and a native build.'
            : 'Notifications are blocked. Enable them in device settings, then try again.',
        );
      }
      await registerCurrentPushDevice(userId);
      setEnabled(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to enable notifications.';
      setError(message);
      if (blocked)
        Alert.alert('Notifications blocked', message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () => {
              void Linking.openSettings().catch(() => setError('Unable to open device settings.'));
            },
          },
        ]);
      throw new Error(message, { cause });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function disable(): Promise<void> {
    if (busy.current) throw new Error('Notification setup is busy. Please try again.');
    busy.current = true;
    setPending(true);
    try {
      await disableCurrentPushDevice();
      setEnabled(false);
      setError(null);
    } catch (cause) {
      setError('Unable to disable notifications. Check your connection and try again.');
      throw new Error('Unable to disable notifications.', { cause });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <PushContext.Provider
      value={{
        enabled,
        permission,
        pending,
        error,
        enable,
        disable,
        destination,
        consumeDestination: () => setDestination(null),
      }}
    >
      {children}
    </PushContext.Provider>
  );
}
