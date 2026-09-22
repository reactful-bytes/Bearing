import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { AppTabs, DESKTOP_NAVIGATION_WIDTH, usesDesktopNavigation } from '../navigation/AppTabs';

const mockNavigate = jest.fn();
const mockActiveTabName = { value: 'Plan' };
const mockNavigationRef = {
  canGoBack: jest.fn(() => false),
  goBack: jest.fn(),
  navigate: mockNavigate,
};

jest.mock('../screens/CalendarScreen', () => ({
  CalendarScreen: () => null,
}));

jest.mock('../screens/CalendarSourcesScreen', () => ({
  CalendarSourcesScreen: () => null,
}));

jest.mock('../screens/EventDetailScreen', () => ({
  EventDetailScreen: () => null,
}));

jest.mock('../screens/GoalsScreen', () => ({
  GoalsScreen: () => null,
}));

jest.mock('../screens/GoalDetailScreen', () => ({
  GoalDetailScreen: () => null,
}));

jest.mock('../screens/FocusModeScreen', () => ({
  FocusModeScreen: () => null,
}));

jest.mock('../screens/NotesScreen', () => ({
  NotesScreen: () => null,
}));

jest.mock('../screens/PlanScreen', () => ({
  PlanScreen: () => null,
}));

jest.mock('../screens/ProfileScreen', () => ({
  ProfileScreen: () => null,
}));

jest.mock('../screens/PremiumPaywallScreen', () => ({
  PremiumPaywallScreen: () => null,
}));

jest.mock('../screens/LegalDocumentScreen', () => ({
  LegalDocumentScreen: () => null,
}));

jest.mock('../screens/TasksScreen', () => ({
  TasksScreen: () => null,
}));

jest.mock('../screens/NoteEditorScreen', () => ({
  NoteEditorScreen: () => null,
}));

jest.mock('../screens/CreationScreens', () => ({
  CreateEventScreen: () => null,
  CreateEventFromNoteScreen: () => null,
  CreateGoalScreen: () => null,
  CreateGoalFromNoteScreen: () => null,
  CreateNoteScreen: () => null,
  CreateTaskScreen: () => null,
  CreateTaskFromNoteScreen: () => null,
}));

jest.mock('../components/presentation/CreateFabGroup', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    CreateFabGroup: ({
      visible,
      onPress,
      onDismiss,
      onCreateGoal,
      onCreateTask,
      onCreateNote,
      onCreateEvent,
      onCreateFocus,
    }: {
      visible: boolean;
      onPress?: () => void;
      onDismiss: () => void;
      onCreateGoal: () => void;
      onCreateTask: () => void;
      onCreateNote: () => void;
      onCreateEvent: () => void;
      onCreateFocus: () => void;
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        ReactModule.createElement(Pressable, {
          testID: 'create-fab-button',
          accessibilityLabel: visible ? 'Close create menu' : 'Create',
          onPress: visible ? onDismiss : onPress,
        }),
        visible ? ReactModule.createElement(Text, { testID: 'create-fab-group' }, 'Create') : null,
        ReactModule.createElement(Pressable, {
          testID: 'create-fab-close',
          accessibilityLabel: 'Close create menu',
          onPress: onDismiss,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'create-goal-action',
          onPress: onCreateGoal,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'create-task-action',
          onPress: onCreateTask,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'create-note-action',
          onPress: onCreateNote,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'create-event-action',
          onPress: onCreateEvent,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'create-focus-action',
          onPress: onCreateFocus,
        }),
      ),
  };
});

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({
    children,
    onStateChange,
  }: {
    children: React.ReactNode;
    onStateChange?: (state: { index: number; routes: { name: string }[] }) => void;
  }) => {
    const ReactModule = jest.requireActual<typeof import('react')>('react');
    ReactModule.useEffect(() => {
      onStateChange?.({ index: 0, routes: [{ name: mockActiveTabName.value }] });
    }, []);
    return <>{children}</>;
  },
  useNavigationContainerRef: jest.fn(() => mockNavigationRef),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  useNavigationState: jest.fn(
    (
      selector: (state: {
        index: number;
        routes: { name: string; state?: { index: number; routes: { name: string }[] } }[];
      }) => unknown,
    ) =>
      selector({
        index: 0,
        routes: [{ name: mockActiveTabName.value }],
      }),
  ),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 24, left: 0 })),
}));

jest.mock('@react-navigation/bottom-tabs', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  function Screen() {
    return null;
  }

  function Navigator({
    screenOptions,
    children,
  }: {
    screenOptions: any;
    children: React.ReactNode;
  }) {
    return (
      <View>
        {ReactModule.Children.map(children, (child) => {
          if (
            !ReactModule.isValidElement<{
              name: string;
              options?: Record<string, unknown>;
            }>(child)
          ) {
            return null;
          }

          const route = { name: child.props.name };
          const sharedOptions =
            typeof screenOptions === 'function' ? screenOptions({ route }) : (screenOptions ?? {});
          const mergedOptions = { ...sharedOptions, ...child.props.options };
          const icon = mergedOptions.tabBarIcon?.({
            focused: route.name === 'Calendar',
            color: '#0E5E85',
            size: 24,
          });

          if (mergedOptions.tabBarButton) {
            return (
              <View key={route.name}>
                {mergedOptions.tabBarButton({
                  children: icon,
                  onPress: mergedOptions.tabBarButton ? jest.fn() : undefined,
                  style: { flex: 1 },
                })}
              </View>
            );
          }

          return (
            <View key={route.name} testID={`tab-button-${route.name}`}>
              <View testID={`tab-bar-${route.name}`} style={mergedOptions.tabBarStyle} />
              {icon}
            </View>
          );
        })}
      </View>
    );
  }

  return {
    createBottomTabNavigator: () => ({ Navigator, Screen }),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  function Screen({
    children,
    component,
  }: {
    children?: React.ReactNode;
    component?: React.ComponentType<unknown>;
  }) {
    if (component) {
      return ReactModule.createElement(component);
    }

    if (ReactModule.isValidElement(children)) {
      return ReactModule.createElement(ReactModule.Fragment, null, children);
    }

    if (typeof children === 'function') {
      const renderScreen = children as unknown as React.ComponentType<{
        navigation: { navigate: typeof mockNavigate };
      }>;
      return ReactModule.createElement(renderScreen, {
        navigation: { navigate: mockNavigate },
      });
    }

    return null;
  }

  function Navigator({ children }: { children: React.ReactNode }) {
    return <View>{ReactModule.Children.map(children, (child) => child)}</View>;
  }

  return {
    createNativeStackNavigator: () => ({ Navigator, Screen }),
  };
});

describe('AppTabs', () => {
  it('uses desktop navigation only for wide web viewports', () => {
    expect(usesDesktopNavigation('web', 1024)).toBe(true);
    expect(usesDesktopNavigation('web', 1023)).toBe(false);
    expect(usesDesktopNavigation('ios', 1440)).toBe(false);
    expect(usesDesktopNavigation('android', 1440)).toBe(false);
  });

  it('keeps the desktop rail close to its icon and longest label', () => {
    expect(DESKTOP_NAVIGATION_WIDTH).toBe(152);
  });

  it('renders Create as a standalone FAB instead of a tab action', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    expect(getByTestId('create-fab-button').props.accessibilityLabel).toBe('Create');
  });

  it('hides the Create FAB on the Profile tab', () => {
    mockActiveTabName.value = 'Profile';
    const { getByTestId, queryByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    expect(() => getByTestId('create-fab-button')).toThrow();
    expect(queryByTestId('create-fab-group')).toBeNull();
    mockActiveTabName.value = 'Plan';
  });

  it('expands the global Create FAB group without selecting a destination', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    fireEvent.press(getByTestId('create-fab-button'));

    expect(getByTestId('create-fab-group')).toBeTruthy();
  });

  it('provides a close action inside the expanded Create FAB group', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    fireEvent.press(getByTestId('create-fab-button'));

    expect(getByTestId('create-fab-close').props.accessibilityLabel).toBe('Close create menu');
  });

  it.each([
    ['goal', 'create-goal-action', { screen: 'CreateGoal' }],
    ['task', 'create-task-action', { screen: 'CreateTask' }],
    ['note', 'create-note-action', { screen: 'CreateNote' }],
    ['event', 'create-event-action', { screen: 'CreateEvent' }],
    ['focus', 'create-focus-action', { screen: 'FocusMode' }],
  ])('routes the global %s action to its typed screen', (_action, testID, target) => {
    mockNavigate.mockClear();
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    fireEvent.press(getByTestId('create-fab-button'));
    fireEvent.press(getByTestId(testID));

    const tab =
      target.screen === 'CreateNote'
        ? 'Notes'
        : target.screen === 'CreateEvent'
          ? 'Calendar'
          : 'Plan';
    expect(mockNavigate).toHaveBeenCalledWith(tab, target);
  });

  it('does not render a mobile bottom navigation bar', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    expect(() => getByTestId('tab-button-Plan')).toThrow();
  });
});
