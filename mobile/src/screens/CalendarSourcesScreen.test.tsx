import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CalendarSourcesScreen } from './CalendarSourcesScreen';

const mockToggleCalendar = jest.fn(async () => undefined);
const mockSetDefaultCalendar = jest.fn(async () => undefined);

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'test-user' } })),
}));

jest.mock('../features/calendar/useDeviceCalendars', () => ({
  useDeviceCalendars: jest.fn(() => ({
    calendars: [
      {
        id: 'work',
        title: 'Work',
        color: null,
        sourceLabel: 'Device',
        isVisible: true,
        isPrimary: true,
        isSynced: true,
        accessLevel: 'owner',
        allowsModifications: true,
      },
    ],
    permission: 'granted',
    selectedCalendarIds: ['work'],
    defaultCalendarId: null,
    uiState: 'ready',
    error: null,
    staleSelectionRecovered: false,
    requestPermission: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
    toggleCalendar: mockToggleCalendar,
    setDefaultCalendar: mockSetDefaultCalendar,
    openSettings: jest.fn(async () => undefined),
  })),
}));

describe('CalendarSourcesScreen', () => {
  it('renders live source settings and delegates visibility changes', async () => {
    render(<CalendarSourcesScreen navigation={{ goBack: jest.fn() }} />);

    expect(screen.getByText('Calendar Sources')).toBeTruthy();
    expect(screen.getAllByText('Work')).toHaveLength(2);
    expect(screen.getByText('Visible')).toBeTruthy();
    expect(screen.getByText('Bearing only')).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText('Work')[0]);

    await waitFor(() => expect(mockToggleCalendar).toHaveBeenCalledWith('work'));
  });

  it('delegates the back action', () => {
    const goBack = jest.fn();
    render(<CalendarSourcesScreen navigation={{ goBack }} />);

    fireEvent.press(screen.getByLabelText('Back to Calendar'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
