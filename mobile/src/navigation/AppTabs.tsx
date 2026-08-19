import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarScreen } from '../screens/CalendarScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { colors, componentTokens, layout, spacing, typography } from '../design/tokens';
import { AppTabParamList } from './navigationTypes';

type AppTabsProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const DESKTOP_NAVIGATION_BREAKPOINT = 1024;
export const DESKTOP_NAVIGATION_WIDTH = 152;

export function usesDesktopNavigation(platform: string, width: number): boolean {
  return platform === 'web' && width >= DESKTOP_NAVIGATION_BREAKPOINT;
}

const TAB_ICON_TEXT: Record<Exclude<keyof AppTabParamList, 'Calendar'>, string> = {
  Goals: 'G',
  Tasks: 'T',
  Notes: 'N',
  Profile: 'P',
};

function TabIcon({
  routeName,
  focused,
  isDesktop,
}: {
  routeName: keyof AppTabParamList;
  focused: boolean;
  isDesktop: boolean;
}) {
  if (routeName === 'Calendar') {
    return (
      <View
        testID="calendar-tab-icon"
        style={[
          styles.logoCircle,
          isDesktop ? styles.logoCircleDesktop : null,
          focused ? styles.logoCircleFocused : null,
        ]}
      >
        <Image source={require('../../assets/logoBlueBackground.png')} style={styles.logoImage} />
      </View>
    );
  }

  return (
    <View style={[styles.iconCircle, focused ? styles.iconCircleFocused : null]}>
      <Text style={[styles.iconText, focused ? styles.iconTextFocused : null]}>
        {TAB_ICON_TEXT[routeName]}
      </Text>
    </View>
  );
}

export function AppTabs({ onPressSignOut, isSignOutPending }: AppTabsProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopNavigation = usesDesktopNavigation(Platform.OS, width);

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Calendar"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarPosition: isDesktopNavigation ? 'left' : 'bottom',
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: isDesktopNavigation
            ? styles.desktopTabBar
            : [
                styles.tabBar,
                {
                  height: layout.tabBarHeight + insets.bottom,
                  paddingBottom: insets.bottom,
                },
              ],
          tabBarItemStyle: isDesktopNavigation ? styles.desktopTabBarItem : undefined,
          tabBarLabelStyle: [
            styles.tabBarLabel,
            isDesktopNavigation ? styles.desktopTabLabel : null,
          ],
          tabBarLabelPosition: isDesktopNavigation ? 'beside-icon' : 'below-icon',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              routeName={route.name as keyof AppTabParamList}
              focused={focused}
              isDesktop={isDesktopNavigation}
            />
          ),
        })}
      >
        <Tab.Screen name="Goals" component={GoalsScreen} />
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={
            isDesktopNavigation
              ? undefined
              : {
                  tabBarLabel: () => null,
                  tabBarButton: ({ children, onLongPress, onPress, accessibilityState, style }) => (
                    <Pressable
                      testID="calendar-tab-button"
                      accessibilityRole="button"
                      accessibilityState={accessibilityState}
                      onLongPress={onLongPress}
                      onPress={onPress}
                      style={[style, styles.calendarTabButton]}
                    >
                      {children}
                    </Pressable>
                  ),
                }
          }
        />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Profile">
          {() => (
            <ProfileScreen onPressSignOut={onPressSignOut} isSignOutPending={isSignOutPending} />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: layout.tabBarHeight,
    paddingTop: layout.tabBarPaddingVertical,
    backgroundColor: componentTokens.tabBar.backgroundColor,
    borderTopColor: componentTokens.tabBar.borderTopColor,
    overflow: 'visible',
  },
  tabBarLabel: {
    ...typography.tabLabel,
  },
  desktopTabBar: {
    width: DESKTOP_NAVIGATION_WIDTH,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xl,
    backgroundColor: componentTokens.tabBar.backgroundColor,
    borderRightColor: componentTokens.tabBar.borderTopColor,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
  },
  desktopTabBarItem: {
    minHeight: 52,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  desktopTabLabel: {
    ...typography.button,
    textAlign: 'left',
  },
  iconCircle: {
    width: layout.tabIconSize,
    height: layout.tabIconSize,
    borderRadius: layout.tabIconRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: componentTokens.tabIcon.backgroundColor,
  },
  iconCircleFocused: {
    backgroundColor: componentTokens.tabIcon.focusedBackgroundColor,
  },
  iconText: {
    ...typography.tabIcon,
    color: componentTokens.tabIcon.textColor,
  },
  iconTextFocused: {
    color: componentTokens.tabIcon.focusedTextColor,
  },
  calendarTabButton: {
    width: 76,
    height: layout.tabBarHeight + 12,
    marginTop: -17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoCircleFocused: {
    borderColor: colors.brand,
  },
  logoCircleDesktop: {
    width: layout.tabIconSize,
    height: layout.tabIconSize,
    borderRadius: layout.tabIconRadius,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});
