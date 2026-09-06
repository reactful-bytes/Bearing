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
import { useTheme } from '../design/ThemeProvider';
import { useThemedStyles } from '../design/useThemedStyles';
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
  const styles = useThemedStyles(createStyles);

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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDesktopNavigation = usesDesktopNavigation(Platform.OS, width);

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Calendar"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarPosition: isDesktopNavigation ? 'left' : 'bottom',
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: isDesktopNavigation
            ? styles.desktopTabBar
            : [
                styles.tabBar,
                {
                  height: theme.layout.tabBarHeight + insets.bottom,
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    tabBar: {
      height: theme.layout.tabBarHeight,
      paddingTop: theme.layout.tabBarPaddingVertical,
      backgroundColor: theme.componentTokens.tabBar.backgroundColor,
      borderTopColor: theme.componentTokens.tabBar.borderTopColor,
      overflow: 'visible',
    },
    tabBarLabel: {
      ...theme.typography.tabLabel,
    },
    desktopTabBar: {
      width: DESKTOP_NAVIGATION_WIDTH,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xl,
      backgroundColor: theme.componentTokens.tabBar.backgroundColor,
      borderRightColor: theme.componentTokens.tabBar.borderTopColor,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderTopWidth: 0,
    },
    desktopTabBarItem: {
      minHeight: 52,
      borderRadius: 8,
      marginVertical: theme.spacing.xs,
    },
    desktopTabLabel: {
      ...theme.typography.button,
      textAlign: 'left',
    },
    iconCircle: {
      width: theme.layout.tabIconSize,
      height: theme.layout.tabIconSize,
      borderRadius: theme.layout.tabIconRadius,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.componentTokens.tabIcon.backgroundColor,
    },
    iconCircleFocused: {
      backgroundColor: theme.componentTokens.tabIcon.focusedBackgroundColor,
    },
    iconText: {
      ...theme.typography.tabIcon,
      color: theme.componentTokens.tabIcon.textColor,
    },
    iconTextFocused: {
      color: theme.componentTokens.tabIcon.focusedTextColor,
    },
    calendarTabButton: {
      width: 76,
      height: theme.layout.tabBarHeight + 12,
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
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    logoCircleFocused: {
      borderColor: theme.colors.brand,
    },
    logoCircleDesktop: {
      width: theme.layout.tabIconSize,
      height: theme.layout.tabIconSize,
      borderRadius: theme.layout.tabIconRadius,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
  });
