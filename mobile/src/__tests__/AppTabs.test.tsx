import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { layout } from '../design/tokens';
import { AppTabs } from '../navigation/AppTabs';

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

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  function Screen() {
    return null;
  }

  function Navigator({ screenOptions, children }: { screenOptions: any; children: React.ReactNode }) {
    return (
      <View>
        {React.Children.map(children, (child: any) => {
          if (!React.isValidElement(child)) {
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
  it('renders the Calendar tab button as an oversized floating action', () => {
    const { getByTestId } = render(
      <AppTabs onPressSignOut={jest.fn()} isSignOutPending={false} />,
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
      expect.arrayContaining([expect.objectContaining({ height: 76, width: 76, borderRadius: 38 })]),
    );
  });
});