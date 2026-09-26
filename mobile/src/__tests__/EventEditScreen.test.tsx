import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { BearingEvent, createUnpublishedMetadata } from '../features/calendar/calendarTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { useUserProfile } from '../features/profile/useUserProfile';
import { EventEditScreen } from '../screens/EventEditScreen';

jest.mock('../features/calendar/useCalendarEvents', () => ({
  useCalendarEvents: jest.fn(),
}));

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

function makeEvent(): BearingEvent {
  const startAt = new Date('2026-09-08T10:00:00.000Z');
  return {
    id: 'event-1',
    userId: 'user-1',
    title: 'Planning session',
    description: '',
    startAt,
    endAt: new Date('2026-09-08T11:00:00.000Z'),
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      endAt: null,
      occurrenceCount: null,
      weekdays: [],
    },
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    ownership: 'bearing',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

describe('EventEditScreen', () => {
  it('asks for the recurring update scope before applying changes', async () => {
    const event = makeEvent();
    const updateEvent = jest.fn(async () => undefined);
    const goBack = jest.fn();
    (useCalendarEvents as jest.MockedFunction<typeof useCalendarEvents>).mockReturnValue({
      events: [event],
      uiState: 'ready',
      updateEvent,
      getSupportedUpdateScopes: () => ['instance', 'following', 'series'],
    } as unknown as ReturnType<typeof useCalendarEvents>);
    (useUserProfile as jest.MockedFunction<typeof useUserProfile>).mockReturnValue({
      profile: { locale: 'en-US', timeFormat: '12-hour' },
    } as never);

    render(
      <EventEditScreen
        route={{ params: { eventId: event.id, dateIso: event.startAt.toISOString() } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Event title'), 'Updated planning session');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    expect(screen.getByText('Apply these changes to which events?')).toBeTruthy();
    expect(screen.getByLabelText('Event title').props.value).toBe('Updated planning session');
    expect(screen.getByText('Yes, update')).toBeTruthy();
    expect(screen.getByLabelText('Cancel edit event')).toBeTruthy();
    expect(screen.getByLabelText('Confirm recurring update')).toBeTruthy();
    expect(updateEvent).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Update this event only'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm recurring update'));
    });

    expect(updateEvent).toHaveBeenCalledWith(
      event,
      expect.objectContaining({ title: 'Updated planning session' }),
      'instance',
    );
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('closes the edit screen when Cancel is pressed during scope selection', async () => {
    const event = makeEvent();
    const goBack = jest.fn();
    (useCalendarEvents as jest.MockedFunction<typeof useCalendarEvents>).mockReturnValue({
      events: [event],
      uiState: 'ready',
      updateEvent: jest.fn(async () => undefined),
      getSupportedUpdateScopes: () => ['series'],
    } as unknown as ReturnType<typeof useCalendarEvents>);
    (useUserProfile as jest.MockedFunction<typeof useUserProfile>).mockReturnValue({
      profile: { locale: 'en-US', timeFormat: '12-hour' },
    } as never);

    render(
      <EventEditScreen
        route={{ params: { eventId: event.id, dateIso: event.startAt.toISOString() } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Event title'), 'Draft title');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });
    fireEvent.press(screen.getByLabelText('Cancel edit event'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
