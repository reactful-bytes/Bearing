import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotificationSettings } from '../components/profile/NotificationSettings';
import { usePushNotifications } from '../features/notifications/PushNotificationProvider';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../features/notifications/notificationPreferences';

jest.mock('../features/notifications/PushNotificationProvider', () => ({
  usePushNotifications: jest.fn(),
}));
const enable = jest.fn(async () => undefined);
const disable = jest.fn(async () => undefined);

beforeEach(() => {
  enable.mockReset().mockResolvedValue(undefined);
  disable.mockReset().mockResolvedValue(undefined);
  jest.mocked(usePushNotifications).mockReturnValue({
    enabled: false,
    permission: 'undetermined',
    pending: false,
    error: null,
    enable,
    disable,
    destination: null,
    consumeDestination: jest.fn(),
  });
});

describe('Profile notification settings', () => {
  it('requests permissions contextually only when enabling, not on render', async () => {
    render(
      <NotificationSettings
        preferences={DEFAULT_NOTIFICATION_PREFERENCES}
        onSave={jest.fn(async () => undefined)}
      />,
    );
    expect(enable).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent(screen.getByLabelText('Enable push notifications'), 'valueChange', true),
    );
    expect(enable).toHaveBeenCalledTimes(1);
  });
  it('saves due-date preferences with exact chosen values and enables push', async () => {
    const onSave = jest.fn(async () => undefined);
    render(<NotificationSettings preferences={DEFAULT_NOTIFICATION_PREFERENCES} onSave={onSave} />);
    fireEvent(screen.getByLabelText('Enable goal task due-date reminders'), 'valueChange', true);
    fireEvent.changeText(screen.getByLabelText('Due date reminder days'), '3');
    fireEvent.changeText(screen.getByLabelText('Morning reminder time'), '07:15');
    await act(async () => fireEvent.press(screen.getByText('Save notification preferences')));
    expect(enable).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      dueDateEnabled: true,
      daysBeforeDueDate: 3,
      morningTime: '07:15',
    });
  });
  it('does not persist invalid settings or pretend denied permissions succeeded', async () => {
    const onSave = jest.fn(async () => undefined);
    render(<NotificationSettings preferences={DEFAULT_NOTIFICATION_PREFERENCES} onSave={onSave} />);
    fireEvent.changeText(screen.getByLabelText('Due date reminder days'), '29');
    await act(async () => fireEvent.press(screen.getByText('Save notification preferences')));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Due date reminder days'), '1');
    fireEvent(screen.getByLabelText('Enable goal task due-date reminders'), 'valueChange', true);
    enable.mockRejectedValueOnce(new Error('Notifications are blocked.'));
    await act(async () => fireEvent.press(screen.getByText('Save notification preferences')));
    expect(screen.getByText('Notifications are blocked.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
  it('allows opting out without requesting permissions', async () => {
    const onSave = jest.fn(async () => undefined);
    render(
      <NotificationSettings
        preferences={{ ...DEFAULT_NOTIFICATION_PREFERENCES, dueDateEnabled: true }}
        onSave={onSave}
      />,
    );
    fireEvent(screen.getByLabelText('Enable goal task due-date reminders'), 'valueChange', false);
    await act(async () => fireEvent.press(screen.getByText('Save notification preferences')));
    expect(enable).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(DEFAULT_NOTIFICATION_PREFERENCES);
  });
});
