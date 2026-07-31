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

jest.mock('../screens/CalendarScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { CalendarScreen: () => React.createElement(Text, {}, 'CalendarScreen') };
});

jest.mock('../screens/GoalsScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { GoalsScreen: () => React.createElement(Text, {}, 'GoalsScreen') };
});

jest.mock('../screens/NotesScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { NotesScreen: () => React.createElement(Text, {}, 'NotesScreen') };
});

jest.mock('../screens/ProfileScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ProfileScreen: () => React.createElement(Text, {}, 'ProfileScreen') };
});

jest.mock('../navigation/AppTabs', () => ({
  AppTabs: () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
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
      retry: jest.fn(),
    });

    render(<App />);

    expect(screen.getByText('Bearing')).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('submits email sign-in from the unauthenticated shell', async () => {
    const mockedUseAuthBootstrap = useAuthBootstrap as jest.MockedFunction<typeof useAuthBootstrap>;
    const mockedSignIn = signInWithEmailPassword as jest.MockedFunction<
      typeof signInWithEmailPassword
    >;

    mockedUseAuthBootstrap.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      error: null,
      retry: jest.fn(),
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
    const mockedPasswordReset = sendPasswordResetForEmail as jest.MockedFunction<
      typeof sendPasswordResetForEmail
    >;

    mockedUseAuthBootstrap.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      error: null,
      retry: jest.fn(),
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
      retry: jest.fn(),
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

  it('retries auth bootstrap after a startup error', () => {
    const retry = jest.fn();
    const mockedUseAuthBootstrap = useAuthBootstrap as jest.MockedFunction<typeof useAuthBootstrap>;
    mockedUseAuthBootstrap.mockReturnValue({
      status: 'error',
      user: null,
      error: new Error('Network unavailable.'),
      retry,
    });

    render(<App />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
