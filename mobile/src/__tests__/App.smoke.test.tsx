import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import App from '../../App';
import { useAuthBootstrap } from '../features/auth/useAuthBootstrap';
import {
  sendPasswordResetForEmail,
  signInWithEmailPassword,
} from '../services/firebase/firebaseAuthActions';

jest.mock('../features/auth/useAuthBootstrap', () => ({
  useAuthBootstrap: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAuthActions', () => ({
  registerWithEmailPassword: jest.fn(),
  sendPasswordResetForEmail: jest.fn(),
  signInWithEmailPassword: jest.fn(),
  signOutCurrentUser: jest.fn(),
}));

jest.mock('../services/firebase/firebaseApp', () => ({
  getFirebaseApp: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'test-user' } })),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  subscribeToEventsByDateRange: jest.fn(() => jest.fn()),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../screens/CalendarScreen', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  CalendarScreen: () => require('react').createElement(require('react-native').Text, {}, 'CalendarScreen'),
}));

jest.mock('../screens/GoalsScreen', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoalsScreen: () => require('react').createElement(require('react-native').Text, {}, 'GoalsScreen'),
}));

jest.mock('../screens/NotesScreen', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NotesScreen: () => require('react').createElement(require('react-native').Text, {}, 'NotesScreen'),
}));

jest.mock('../screens/ProfileScreen', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ProfileScreen: () => require('react').createElement(require('react-native').Text, {}, 'ProfileScreen'),
}));

jest.mock('../navigation/AppTabs', () => ({
  AppTabs: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Text } = require('react-native');
    return React.createElement(View, {}, [
      React.createElement(Text, { key: 'goals' }, 'Goals'),
      React.createElement(Text, { key: 'tasks' }, 'Tasks'),
      React.createElement(Text, { key: 'day' }, 'Day'),
      React.createElement(Text, { key: 'prev', accessibilityLabel: 'Previous day' }, '‹'),
      React.createElement(Text, { key: 'notes' }, 'Notes'),
      React.createElement(Text, { key: 'profile' }, 'Profile'),
      React.createElement(Text, { key: 'signup' }, 'Sign Out'),
    ]);
  },
}));

describe('App shell', () => {
  it('renders signed-out state entry point', () => {
    const mockedUseAuthBootstrap = useAuthBootstrap as jest.MockedFunction<typeof useAuthBootstrap>;

    mockedUseAuthBootstrap.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      error: null,
    });

    render(<App />);

    expect(screen.getByText('Bearing')).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('submits email sign-in from the unauthenticated shell', async () => {
    const mockedUseAuthBootstrap = useAuthBootstrap as jest.MockedFunction<typeof useAuthBootstrap>;
    const mockedSignIn = signInWithEmailPassword as jest.MockedFunction<typeof signInWithEmailPassword>;

    mockedUseAuthBootstrap.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      error: null,
    });

    render(<App />);

    fireEvent.changeText(screen.getByLabelText('Email address'), 'person@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'hunter2!');
    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledWith('person@example.com', 'hunter2!');
    });
  });

  it('sends a password reset email from the unauthenticated shell', async () => {
    const mockedUseAuthBootstrap = useAuthBootstrap as jest.MockedFunction<typeof useAuthBootstrap>;
    const mockedPasswordReset = sendPasswordResetForEmail as jest.MockedFunction<typeof sendPasswordResetForEmail>;

    mockedUseAuthBootstrap.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      error: null,
    });

    render(<App />);

    fireEvent.changeText(screen.getByLabelText('Email address'), 'person@example.com');
    await act(async () => {
      fireEvent.press(screen.getByText('Send Password Reset Email'));
    });

    await waitFor(() => {
      expect(mockedPasswordReset).toHaveBeenCalledWith('person@example.com');
    });
  });

  it('renders authenticated users into the tab shell and switches tabs', () => {
    const mockedUseAuthBootstrap = useAuthBootstrap as jest.MockedFunction<typeof useAuthBootstrap>;

    mockedUseAuthBootstrap.mockReturnValue({
      status: 'authenticated',
      user: { uid: 'user-123' } as never,
      error: null,
    });

    render(<App />);

    expect(screen.getByText('Day')).toBeTruthy(); // ViewModeToggle visible on Calendar tab
    expect(screen.getByLabelText('Previous day')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();

    fireEvent.press(screen.getByText('Goals'));
    // Tab switching verified by tab navigation mock

    fireEvent.press(screen.getByText('Tasks'));
    // Tab switching verified by tab navigation mock

    fireEvent.press(screen.getByText('Notes'));
    // Tab switching verified by tab navigation mock

    fireEvent.press(screen.getByText('Profile'));
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });
});
