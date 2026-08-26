import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { EventDetailModal } from '../components/calendar/EventDetailModal';
import {
  BearingEvent,
  DeviceCalendarEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';

const startAt = new Date('2026-07-31T09:00:00.000Z');
const endAt = new Date('2026-07-31T10:00:00.000Z');

function makeBearingEvent(): BearingEvent {
  return {
    ownership: 'bearing',
    id: 'bearing-1',
    userId: 'user-1',
    title: 'Bearing planning',
    description: 'Plan the week',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

function makeDeviceEvent(allowsModifications: boolean): DeviceCalendarEvent {
  return {
    ownership: 'device',
    id: 'device:work:native-1',
    nativeEventId: 'native-1',
    calendarId: 'work',
    calendarTitle: 'Work',
    calendarColor: '#123456',
    sourceLabel: 'Device account',
    allowsModifications,
    title: 'Device planning',
    description: '',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    status: 'scheduled',
  };
}

describe('EventDetailModal', () => {
  it('edits Bearing events through the reusable event form', async () => {
    const event = makeBearingEvent();
    const onUpdate = jest.fn(async () => undefined);
    render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={onUpdate}
        onDelete={jest.fn(async () => undefined)}
      />,
    );

    fireEvent.press(screen.getByLabelText('Edit event'));
    fireEvent.changeText(screen.getByLabelText('Event title'), 'Updated planning');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    expect(onUpdate).toHaveBeenCalledWith(
      event,
      expect.objectContaining({ title: 'Updated planning', description: 'Plan the week' }),
    );
  });

  it('edits and confirms deletion for writable device events', async () => {
    const event = makeDeviceEvent(true);
    const onUpdate = jest.fn(async () => undefined);
    const onDelete = jest.fn(async () => undefined);
    const { rerender } = render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    fireEvent.press(screen.getByLabelText('Edit event'));
    fireEvent.changeText(screen.getByLabelText('Event title'), 'Updated device event');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });
    expect(onUpdate).toHaveBeenCalledWith(
      event,
      expect.objectContaining({ title: 'Updated device event' }),
    );

    rerender(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(screen.getByLabelText('Delete event'));
    expect(screen.getByText('Delete this event permanently?')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete'));
    });
    expect(onDelete).toHaveBeenCalledWith(event);
  });

  it('shows read-only state without edit or delete actions', () => {
    render(
      <EventDetailModal
        event={makeDeviceEvent(false)}
        onClose={jest.fn()}
        onUpdate={jest.fn(async () => undefined)}
        onDelete={jest.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('This device calendar event is read-only.')).toBeTruthy();
    expect(screen.queryByLabelText('Edit event')).toBeNull();
    expect(screen.queryByLabelText('Delete event')).toBeNull();
  });

  it('retries a failed linked copy without changing the Bearing event', async () => {
    const event = makeBearingEvent();
    event.publication = {
      status: 'failed',
      markerId: '0123456789abcdef0123456789abcdef',
      commonHash: null,
      lastError: 'Device publication failed.',
      retryable: true,
      deletionIntent: false,
    };
    const onRetryPublication = jest.fn(async () => undefined);
    render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={jest.fn(async () => undefined)}
        onDelete={jest.fn(async () => undefined)}
        onRetryPublication={onRetryPublication}
      />,
    );

    expect(screen.getByText('Needs attention')).toBeTruthy();
  expect(screen.getByText('Device publication failed.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Retry device publication'));
    });

    expect(onRetryPublication).toHaveBeenCalledWith(event);
  });
});
