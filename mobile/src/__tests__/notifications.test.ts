import { describe, expect, it } from '@jest/globals';
import { getNotificationDestination } from '../features/notifications/notificationDestination';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  validateNotificationPreferences,
} from '../features/notifications/notificationPreferences';
import {
  shouldPresentReminder,
  suppressForegroundReminders,
} from '../features/notifications/foregroundNotificationPolicy';
import { taskDateFromKey, taskDueDateKey } from '../features/tasks/taskDueDate';

describe('notification public contracts', () => {
  it('defaults to an opt-in, one-day lead and 6 AM', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      dueDateEnabled: false,
      daysBeforeDueDate: 1,
      morningTime: '06:00',
    });
  });
  it('validates exact days-before bounds and 24-hour times', () => {
    for (const daysBeforeDueDate of [0, 28])
      expect(() =>
        validateNotificationPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          daysBeforeDueDate,
        }),
      ).not.toThrow();
    for (const daysBeforeDueDate of [-1, 29, 0.5])
      expect(() =>
        validateNotificationPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          daysBeforeDueDate,
        }),
      ).toThrow();
    for (const morningTime of ['24:00', '6:00', '06:99'])
      expect(() =>
        validateNotificationPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          morningTime,
        }),
      ).toThrow();
  });
  it('opens events, individual due tasks, and grouped tasks only for the current account', () => {
    const data = {
      userId: 'owner',
      kind: 'event',
      eventId: 'event-1',
      dateIso: '2026-10-07T14:00:00Z',
    };
    expect(getNotificationDestination(data, 'owner')).toEqual({
      kind: 'event',
      eventId: 'event-1',
      dateIso: data.dateIso,
    });
    expect(getNotificationDestination(data, 'other')).toBeNull();
    expect(getNotificationDestination({ ...data, dateIso: 'invalid' }, 'owner')).toBeNull();
    expect(
      getNotificationDestination({ userId: 'owner', kind: 'due', taskId: 'task-1' }, 'owner'),
    ).toEqual({
      kind: 'task',
      taskId: 'task-1',
    });
    expect(getNotificationDestination({ userId: 'owner', kind: 'due' }, 'owner')).toEqual({
      kind: 'tasks',
    });
  });
  it('suppresses foreground alerts during Focus Mode and restores once on exit', () => {
    expect(shouldPresentReminder()).toBe(true);
    const release = suppressForegroundReminders();
    expect(shouldPresentReminder()).toBe(false);
    release();
    release();
    expect(shouldPresentReminder()).toBe(true);
  });
  it('preserves date-only targets independently of timezone timestamps', () => {
    const date = new Date('2026-10-08T11:00:00Z');
    expect(taskDueDateKey(date, '2026-10-08')).toBe('2026-10-08');
    expect(taskDueDateKey(taskDateFromKey('2026-10-08'))).toBe('2026-10-08');
    expect(() => taskDueDateKey(date, '2026-02-30')).toThrow();
  });
});
