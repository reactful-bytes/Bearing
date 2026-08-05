import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { ScrollView } from 'react-native';

import { CalendarScreen } from '../screens/CalendarScreen';
import { formatDayLabel } from '../components/calendar/DayNavBar';

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({ profile: { locale: 'en-US', timeFormat: '12-hour' } })),
}));

jest.mock('../features/notes/useNotes', () => ({
  useCreateNote: jest.fn(() => async () => undefined),
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

const FIXED_DATE = new Date(2026, 6, 17); // Friday, July 17, 2026

describe('CalendarScreen navigation', () => {
  it('switches to month view when Month toggle is pressed', () => {
    render(<CalendarScreen initialDateOverride={FIXED_DATE} />);

    fireEvent.press(screen.getByText('Month'));

    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    expect(screen.getByLabelText('Next month')).toBeTruthy();
    // DayNavBar arrows should no longer be visible
    expect(screen.queryByLabelText('Previous day')).toBeNull();
    expect(screen.queryByLabelText('Next day')).toBeNull();
  });

  it('switches back to day view when Day toggle is pressed from month view', () => {
    render(<CalendarScreen initialDateOverride={FIXED_DATE} initialViewMode="month" />);

    fireEvent.press(screen.getByText('Day'));

    expect(screen.getByLabelText('Previous day')).toBeTruthy();
    expect(screen.getByLabelText('Next day')).toBeTruthy();
  });

  it('navigates to previous day when prev arrow is pressed', () => {
    render(<CalendarScreen initialDateOverride={FIXED_DATE} />);

    fireEvent.press(screen.getByLabelText('Previous day'));

    const expectedLabel = formatDayLabel(new Date(2026, 6, 16));
    expect(screen.getByText(expectedLabel)).toBeTruthy();
  });

  it('navigates to next day when next arrow is pressed', () => {
    render(<CalendarScreen initialDateOverride={FIXED_DATE} />);

    fireEvent.press(screen.getByLabelText('Next day'));

    const expectedLabel = formatDayLabel(new Date(2026, 6, 18));
    expect(screen.getByText(expectedLabel)).toBeTruthy();
  });

  it('centers the current time after refreshing today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 17, 14, 30, 0));
    const scrollToSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined);

    try {
      render(<CalendarScreen initialDateOverride={FIXED_DATE} stateOverride="ready" />);

      fireEvent(screen.getByTestId('hourly-timeline-scroll'), 'layout', {
        nativeEvent: { layout: { height: 640, width: 375, x: 0, y: 0 } },
      });
      act(() => jest.advanceTimersByTime(50));
      scrollToSpy.mockClear();

      fireEvent.press(screen.getByLabelText('Refresh calendar events'));
      act(() => jest.advanceTimersByTime(50));

      expect(scrollToSpy).toHaveBeenCalledWith({ y: 608, animated: false });
    } finally {
      scrollToSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('switches to day view and updates selected date when a month date is tapped', () => {
    render(<CalendarScreen initialDateOverride={FIXED_DATE} initialViewMode="month" />);

    // Tap July 20, 2026 in the month grid
    fireEvent.press(screen.getByLabelText('July 20, 2026'));

    // Should switch to day view showing the selected date
    const expectedLabel = formatDayLabel(new Date(2026, 6, 20));
    expect(screen.getByText(expectedLabel)).toBeTruthy();
    expect(screen.getByLabelText('Previous day')).toBeTruthy();
  });

  it('opens Focus Mode from the secondary FAB', () => {
    render(<CalendarScreen initialDateOverride={FIXED_DATE} />);

    fireEvent.press(screen.getByText('Focus'));

    expect(screen.getByLabelText('Idea dump input')).toBeTruthy();
    expect(screen.getByLabelText('Hold to return to calendar')).toBeTruthy();
  });

  it('returns to Calendar after holding the exit control for three seconds', () => {
    jest.useFakeTimers();
    render(<CalendarScreen initialDateOverride={FIXED_DATE} />);

    fireEvent.press(screen.getByText('Focus'));

    const holdButton = screen.getByLabelText('Hold to return to calendar');
    fireEvent(holdButton, 'pressIn');

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByLabelText('Idea dump input')).toBeNull();
    jest.useRealTimers();
  });

  it('opens Focus Mode for a Start Now launch from the Tasks tab', () => {
    jest.useFakeTimers();
    const startAt = new Date(2026, 6, 17, 10, 0, 0);
    const endAt = new Date(2026, 6, 17, 10, 30, 0);
    const setParams = jest.fn();

    jest.setSystemTime(new Date(2026, 6, 17, 10, 5, 0));

    render(
      <CalendarScreen
        initialDateOverride={FIXED_DATE}
        route={{
          params: {
            focusLaunch: {
              token: 'launch-1',
              eventId: 'task-event-1',
              title: 'Deep work sprint',
              description: 'Draft the proposal now.',
              startAtIso: startAt.toISOString(),
              endAtIso: endAt.toISOString(),
              timezone: 'UTC',
            },
          },
        }}
        navigation={{ setParams }}
      />,
    );

    expect(screen.getByText('Deep work sprint')).toBeTruthy();
    expect(screen.getByLabelText('Idea dump input')).toBeTruthy();
    expect(setParams).toHaveBeenCalledWith({ focusLaunch: undefined });

    jest.useRealTimers();
  });
});

describe('formatDayLabel', () => {
  it('formats a known date correctly', () => {
    expect(formatDayLabel(new Date(2026, 6, 17))).toBe('Friday, July 17, 2026');
  });

  it('formats the first day of a month correctly', () => {
    expect(formatDayLabel(new Date(2026, 0, 1))).toBe('Thursday, January 1, 2026');
  });
});
