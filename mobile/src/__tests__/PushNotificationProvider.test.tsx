import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Pressable, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';

import {
  PushNotificationProvider,
  usePushNotifications,
} from '../features/notifications/PushNotificationProvider';
import {
  disableCurrentPushDevice,
  getPushPermission,
  readPushEnabled,
  registerCurrentPushDevice,
} from '../services/notifications/pushNotifications';
import { suppressForegroundReminders } from '../features/notifications/foregroundNotificationPolicy';

jest.mock('../services/notifications/pushNotifications', () => ({
  getPushPermission: jest.fn(),
  readPushEnabled: jest.fn(async () => false),
  registerCurrentPushDevice: jest.fn(async () => undefined),
  disableCurrentPushDevice: jest.fn(async () => undefined),
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));

function Consumer() {
  const push = usePushNotifications();
  const [failure, setFailure] = useState('');
  return (
    <>
      <Text>{push.enabled ? 'Push enabled' : 'Push disabled'}</Text>
      <Text>{push.destination?.kind ?? 'No destination'}</Text>
      <Text>{failure}</Text>
      <Pressable
        accessibilityLabel="Enable reminders"
        onPress={() => {
          void push.enable().catch((error: Error) => setFailure(error.message));
        }}
      >
        <Text>Enable</Text>
      </Pressable>
    </>
  );
}

const notification: Notifications.Notification = {
  date: Date.now(),
  request: {
    identifier: 'notification-1',
    trigger: null,
    content: {
      title: 'Planning',
      body: 'Reminder',
      subtitle: null,
      sound: 'default',
      categoryIdentifier: null,
      launchImageName: null,
      badge: null,
      attachments: [],
      threadIdentifier: null,
      data: { userId: 'owner', kind: 'event', eventId: 'event-1', dateIso: '2026-10-07T14:00:00Z' },
    },
  },
};
const loadNotifications = async () => Notifications;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readPushEnabled).mockResolvedValue(false);
  jest
    .mocked(getPushPermission)
    .mockImplementation(async (request) => (request ? 'granted' : 'undetermined'));
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === 'Continue')?.onPress?.();
  });
});

describe('notification permission and receipt lifecycle', () => {
  it('never prompts on startup and requests permission only after contextual consent', async () => {
    render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(getPushPermission).toHaveBeenCalledWith());
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(registerCurrentPushDevice).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(screen.getByLabelText('Enable reminders')));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Enable reminders',
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
    );
    expect(getPushPermission).toHaveBeenCalledWith(true);
    expect(registerCurrentPushDevice).toHaveBeenCalledWith('owner');
    expect(screen.getByText('Push enabled')).toBeTruthy();
  });
  it('does not register when the user declines the contextual request', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Not now')?.onPress?.();
    });
    render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(getPushPermission).toHaveBeenCalledWith());
    await act(async () => fireEvent.press(screen.getByLabelText('Enable reminders')));
    expect(getPushPermission).not.toHaveBeenCalledWith(true);
    expect(registerCurrentPushDevice).not.toHaveBeenCalled();
    expect(screen.getByText(/Notifications were not enabled/)).toBeTruthy();
  });
  it('surfaces blocked permissions and offers device settings', async () => {
    jest.mocked(getPushPermission).mockResolvedValue('denied');
    render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(getPushPermission).toHaveBeenCalledWith());
    await act(async () => fireEvent.press(screen.getByLabelText('Enable reminders')));
    expect(registerCurrentPushDevice).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Notifications blocked',
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Open settings' })]),
    );
  });
  it('disables server registration after OS permission revocation', async () => {
    jest.mocked(readPushEnabled).mockResolvedValue(true);
    jest.mocked(getPushPermission).mockResolvedValue('denied');
    render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(disableCurrentPushDevice).toHaveBeenCalledTimes(1));
    expect(registerCurrentPushDevice).not.toHaveBeenCalled();
  });
  it('routes authorized taps and suppresses foreground distractions in Focus Mode', async () => {
    render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(Notifications.setNotificationHandler).toHaveBeenCalled());
    const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0][0];
    const release = suppressForegroundReminders();
    try {
      expect(await handler?.handleNotification?.(notification)).toMatchObject({
        shouldShowBanner: false,
        shouldPlaySound: false,
      });
    } finally {
      release();
    }
    expect(await handler?.handleNotification?.(notification)).toMatchObject({
      shouldShowBanner: true,
      shouldPlaySound: true,
    });
    const receiveTap = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock
      .calls[0][0];
    await act(async () => receiveTap({ actionIdentifier: 'default', notification }));
    expect(screen.getByText('event')).toBeTruthy();
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });
  it('handles cold-start responses and ignores another account payload', async () => {
    jest.mocked(Notifications.getLastNotificationResponse).mockReturnValueOnce({
      actionIdentifier: 'default',
      notification,
    });
    const first = render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(screen.getByText('event')).toBeTruthy());
    first.unmount();
    jest.mocked(Notifications.clearLastNotificationResponse).mockClear();
    jest.mocked(Notifications.getLastNotificationResponse).mockReturnValueOnce({
      actionIdentifier: 'default',
      notification,
    });
    render(
      <PushNotificationProvider userId="other" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled());
    expect(screen.getByText('No destination')).toBeTruthy();
  });
  it('fails explicitly without opening a consent dialog on unsupported devices', async () => {
    jest.mocked(getPushPermission).mockResolvedValue('unavailable');
    render(
      <PushNotificationProvider userId="owner" loadNotifications={loadNotifications}>
        <Consumer />
      </PushNotificationProvider>,
    );
    await waitFor(() => expect(getPushPermission).toHaveBeenCalledWith());
    await act(async () => fireEvent.press(screen.getByLabelText('Enable reminders')));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Push reminders require a physical Android or iOS device and a native build.',
      ),
    ).toBeTruthy();
  });
});
