import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CalendarScreen } from '../screens/CalendarScreen';
import { colors } from '../design/tokens';
import { CalendarEvent, createUnpublishedMetadata } from '../features/calendar/calendarTypes';

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({ profile: { locale: 'en-US', timeFormat: '12-hour' } })),
}));

jest.mock('../features/notes/useNotes', () => ({
  useCreateNote: jest.fn(() => jest.fn()),
}));

jest.mock('../features/calendar/useDeviceCalendars', () => {
  const state = {
    calendars: [],
    permission: 'unavailable',
    selectedCalendarIds: [],
    defaultCalendarId: null,
    uiState: 'unavailable',
    error: null,
    staleSelectionRecovered: false,
    requestPermission: jest.fn(),
    refresh: jest.fn(),
    toggleCalendar: jest.fn(),
    setDefaultCalendar: jest.fn(),
    openSettings: jest.fn(),
  };
  return { useDeviceCalendars: jest.fn(() => state) };
});

// Mock Firebase services
jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'test-user' } })),
}));

jest.mock('../services/firebase/firebaseApp', () => ({
  getFirebaseApp: jest.fn(),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  subscribeToEventsByDateRange: jest.fn(() => jest.fn()),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useWindowDimensions: jest.fn(() => ({ width: 375, height: 812 })),
}));

function makeTestEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const startAt = new Date(2026, 6, 17, 10, 0, 0);
  const endAt = new Date(2026, 6, 17, 11, 0, 0);
  return {
    ownership: 'bearing',
    id: 'test-event-1',
    userId: 'u1',
    title: 'Test event',
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
    goalId: null,
    stepId: null,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    publication: overrides.publication ?? createUnpublishedMetadata(),
  };
}

describe('CalendarScreen interaction states', () => {
  it('renders day view with view mode toggle and day navigation by default', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('Month')).toBeTruthy();
    expect(screen.getByLabelText('Previous day')).toBeTruthy();
    expect(screen.getByLabelText('Next day')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Focus' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toHaveStyle({
      backgroundColor: colors.textPrimary,
    });
    expect(screen.queryByText('+')).toBeNull();
  });

  it('renders loading state in the timeline area', () => {
    render(<CalendarScreen stateOverride="loading" />);

    expect(screen.getByText('Loading events...')).toBeTruthy();
  });

  it('renders error state in the timeline area', () => {
    render(<CalendarScreen stateOverride="error" />);

    expect(screen.getByText('Unable to load events. Try again in a moment.')).toBeTruthy();
  });

  it('renders event block titles in ready state with override events', () => {
    const events: CalendarEvent[] = [
      makeTestEvent({ id: 'e1', title: 'Morning standup' }),
      makeTestEvent({
        id: 'e2',
        title: 'Design review',
        startAt: new Date(2026, 6, 17, 14, 0),
        endAt: new Date(2026, 6, 17, 15, 0),
      }),
    ];
    render(
      <CalendarScreen
        stateOverride="ready"
        eventsOverride={events}
        initialDateOverride={new Date(2026, 6, 17)}
      />,
    );

    expect(screen.getByText('Morning standup')).toBeTruthy();
    expect(screen.getByText('Design review')).toBeTruthy();
  });

  it('renders all-day events above the hourly timeline instead of as timed blocks', () => {
    const allDayEvent = makeTestEvent({
      id: 'all-day-1',
      title: 'Company holiday',
      startAt: new Date(2026, 6, 17),
      endAt: new Date(2026, 6, 18),
      allDay: true,
    });

    render(
      <CalendarScreen
        stateOverride="ready"
        eventsOverride={[allDayEvent]}
        initialDateOverride={new Date(2026, 6, 17)}
      />,
    );

    expect(screen.getByTestId('all-day-events-header')).toBeTruthy();
    expect(screen.getByTestId('all-day-event-all-day-1')).toBeTruthy();
    expect(screen.queryByTestId('timed-event-all-day-1')).toBeNull();
  });

  it('bounds offscreen month rendering to the visible neighborhood', () => {
    render(<CalendarScreen initialViewMode="month" />);

    const carousel = screen.getByTestId('month-carousel');
    expect(carousel.props.initialNumToRender).toBe(1);
    expect(carousel.props.maxToRenderPerBatch).toBe(2);
    expect(carousel.props.windowSize).toBe(3);

    fireEvent.press(screen.getByText('Day'));
    expect(screen.queryByTestId('month-carousel')).toBeNull();
  });

  it('Add FAB is disabled in loading state', () => {
    render(<CalendarScreen stateOverride="loading" />);
    const addEventFab = screen.getByRole('button', { name: 'Add' });
    expect(addEventFab.props.accessibilityState.disabled).toBe(true);
  });
});
