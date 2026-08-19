import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { layout } from '../design/tokens';
import { AppTabs, DESKTOP_NAVIGATION_WIDTH, usesDesktopNavigation } from '../navigation/AppTabs';

jest.mock('../screens/CalendarScreen', () => ({
  CalendarScreen: () => null,
}));

jest.mock('../screens/GoalsScreen', () => ({
  GoalsScreen: () => null,
}));

jest.mock('../screens/NotesScreen', () => ({
  NotesScreen: () => null,
}));

jest.mock('../screens/ProfileScreen', () => ({
  ProfileScreen: () => null,
}));

jest.mock('../screens/TasksScreen', () => ({
  TasksScreen: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
                  onPress: jest.fn(),
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

  it('renders the Calendar tab button as an oversized floating action', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    const calendarTabButton = getByTestId('calendar-tab-button');
    const calendarTabIcon = getByTestId('calendar-tab-icon');

    expect(calendarTabButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: layout.tabBarHeight + 12,
          marginTop: -17,
          width: 76,
        }),
      ]),
    );
    expect(calendarTabIcon.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ height: 76, width: 76, borderRadius: 38 }),
      ]),
    );
  });

  it('reserves the Android bottom safe-area inset for the tab bar', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn<() => void>()} isSignOutPending={false} />,
    );

    expect(getByTestId('tab-bar-Goals').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: layout.tabBarHeight + 24,
          paddingBottom: 24,
        }),
      ]),
    );
  });
});
