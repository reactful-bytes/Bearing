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

function makeBearingEvent(overrides: Partial<BearingEvent> = {}): BearingEvent {
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
    sourceTaskId: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
    ...overrides,
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
    expect(onDelete).toHaveBeenCalledWith(event, 'series');
  });

  it('asks which part of a recurring series to delete and confirms the chosen scope', async () => {
    const event = makeBearingEvent({
      recurrenceRule: {
        frequency: 'weekly',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: [],
      },
    });
    const onDelete = jest.fn(async () => undefined);
    render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={jest.fn(async () => undefined)}
        onDelete={onDelete}
      />,
    );

    fireEvent.press(screen.getByLabelText('Delete event'));
    expect(screen.getByText('Delete which events?')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Delete this event only'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete'));
    });

    expect(onDelete).toHaveBeenCalledWith(event, 'instance');
  });

  it('requires an explicit supported scope before updating a recurring event', async () => {
    const event = makeBearingEvent({
      recurrenceRule: {
        frequency: 'weekly',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: [],
      },
    });
    const onUpdate = jest.fn(async () => undefined);
    render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={onUpdate}
        onDelete={jest.fn(async () => undefined)}
        supportedUpdateScopes={['series']}
      />,
    );

    fireEvent.press(screen.getByLabelText('Edit event'));
    fireEvent.changeText(screen.getByLabelText('Event title'), 'Updated planning');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    expect(screen.getByText('Apply these changes to which events?')).toBeTruthy();
    expect(screen.getByLabelText('Event title').props.value).toBe('Updated planning');
    expect(screen.getByText('Yes, update')).toBeTruthy();
    expect(screen.getByLabelText('Cancel edit event')).toBeTruthy();
    expect(screen.queryByText('Update Recurring Event')).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Update this event only (not supported here)')).toBeDisabled();
    expect(screen.getByLabelText('Update this and following (not supported here)')).toBeDisabled();
    expect(screen.getByLabelText('Confirm recurring update')).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Update all events'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm recurring update'));
    });

    expect(onUpdate).toHaveBeenCalledWith(
      event,
      expect.objectContaining({ title: 'Updated planning' }),
      'series',
    );
  });

  it('omits native deletion scopes unsupported by the selected calendar platform', () => {
    const event = makeBearingEvent({
      recurrenceRule: {
        frequency: 'daily',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: [],
      },
    });
    render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={jest.fn(async () => undefined)}
        onDelete={jest.fn(async () => undefined)}
        supportedDeleteScopes={['instance', 'series']}
      />,
    );

    fireEvent.press(screen.getByLabelText('Delete event'));
    expect(screen.getByLabelText('Delete this and following (not supported here)')).toBeTruthy();
    expect(screen.getByLabelText('Delete all events')).toBeTruthy();
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

  it('shows the event metadata fields', () => {
    const event = makeBearingEvent({
      location: 'Studio 4',
      recurrenceRule: {
        frequency: 'weekly',
        interval: 1,
        endAt: null,
        occurrenceCount: null,
        weekdays: ['monday', 'wednesday'],
      },
      alarms: [{ absoluteAt: null, relativeOffsetMinutes: -15 }],
      availability: 'tentative',
      url: 'https://example.com/planning',
    });

    render(
      <EventDetailModal
        event={event}
        onClose={jest.fn()}
        onUpdate={jest.fn(async () => undefined)}
        onDelete={jest.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Studio 4')).toBeTruthy();
    expect(screen.getByText('Every week on mon, wed')).toBeTruthy();
    expect(screen.getByText('15 minutes before event')).toBeTruthy();
    expect(screen.getByText('Tentative')).toBeTruthy();
    expect(screen.getByText('https://example.com/planning')).toBeTruthy();
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

    expect(screen.getByText('Device publication failed.')).toBeTruthy();
    expect(screen.getByLabelText('Retry device publication')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Retry device publication'));
    });

    expect(onRetryPublication).toHaveBeenCalledWith(event);
  });
});
