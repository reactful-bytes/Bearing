import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarEvent } from '../features/calendar/calendarTypes';

jest.mock('../features/notes/useNotes', () => ({
  useNotes: jest.fn(() => ({
    notes: [],
    uiState: 'empty',
    createNote: jest.fn(),
  })),
}));

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
    id: 'test-event-1',
    userId: 'u1',
    title: 'Test event',
    description: '',
    startAt,
    endAt,
    timezone: 'UTC',
    goalId: null,
    stepId: null,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CalendarScreen interaction states', () => {
  it('renders day view with view mode toggle and day navigation by default', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('Month')).toBeTruthy();
    expect(screen.getByLabelText('Previous day')).toBeTruthy();
    expect(screen.getByLabelText('Next day')).toBeTruthy();
    expect(screen.getByText('Focus')).toBeTruthy();
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

  it('Add Event FAB is disabled in loading state', () => {
    render(<CalendarScreen stateOverride="loading" />);
    const fabButtons = screen.getAllByRole('button');
    const addEventFab = fabButtons[fabButtons.length - 1]; // Last button is Add Event FAB
    expect(addEventFab.props.accessibilityState.disabled).toBe(true);
  });
});
