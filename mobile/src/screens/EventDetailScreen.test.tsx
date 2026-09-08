import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { useUserProfile } from '../features/profile/useUserProfile';
import { EventDetailScreen } from './EventDetailScreen';

jest.mock('../features/calendar/useCalendarEvents', () => ({
  useCalendarEvents: jest.fn(),
}));

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../components/calendar/EventDetailModal', () => {
  const { Button, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    EventDetailModal: ({
      event,
      onClose,
    }: {
      event: CalendarDisplayEvent;
      onClose: () => void;
    }) => (
      <>
        <Text>{event.title}</Text>
        <Button title="Close event" onPress={onClose} />
      </>
    ),
  };
});

function makeEvent(): CalendarDisplayEvent {
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
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    ownership: 'bearing',
    publication: {
      status: 'unpublished',
      markerId: null,
      commonHash: null,
      lastError: null,
      retryable: false,
      deletionIntent: false,
    },
    createdAt: startAt,
    updatedAt: startAt,
  };
}

describe('EventDetailScreen', () => {
  it('loads the event month and owns the route close action', () => {
    const event = makeEvent();
    const mockedUseCalendarEvents = useCalendarEvents as jest.MockedFunction<
      typeof useCalendarEvents
    >;
    const mockedUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
    mockedUseCalendarEvents.mockReturnValue({
      events: [event],
      uiState: 'ready',
      updateEvent: jest.fn(),
      deleteEvent: jest.fn(),
      retryPublication: jest.fn(),
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useCalendarEvents>);
    mockedUseUserProfile.mockReturnValue({
      profile: { locale: 'en-US', timeFormat: '12-hour' },
    } as never);

    const goBack = jest.fn();
    render(
      <EventDetailScreen
        route={{ params: { eventId: event.id, dateIso: event.startAt.toISOString() } }}
        navigation={{ goBack }}
      />,
    );

    expect(screen.getByText('Planning session')).toBeTruthy();
    expect(mockedUseCalendarEvents).toHaveBeenCalledWith(expect.any(Date));

    fireEvent.press(screen.getByText('Close event'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
