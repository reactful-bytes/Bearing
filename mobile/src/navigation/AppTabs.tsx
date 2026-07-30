import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CalendarScreen } from '../screens/CalendarScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { colors, componentTokens, layout, typography } from '../design/tokens';
import { AppTabParamList } from './navigationTypes';

type AppTabsProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICON_TEXT: Record<Exclude<keyof AppTabParamList, 'Calendar'>, string> = {
  Goals: 'G',
  Tasks: 'T',
  Notes: 'N',
  Profile: 'P',
};

function TabIcon({ routeName, focused }: { routeName: keyof AppTabParamList; focused: boolean }) {
  if (routeName === 'Calendar') {
    return (
      <View testID="calendar-tab-icon" style={[styles.logoCircle, focused ? styles.logoCircleFocused : null]}>
        <Image source={require('../../assets/logoBlueBackground.png')} style={styles.logoImage} />
      </View>
    );
  }

  return (
    <View style={[styles.iconCircle, focused ? styles.iconCircleFocused : null]}>
      <Text style={[styles.iconText, focused ? styles.iconTextFocused : null]}>{TAB_ICON_TEXT[routeName]}</Text>
    </View>
  );
}

export function AppTabs({ onPressSignOut, isSignOutPending }: AppTabsProps) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Calendar"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ focused }) => (
            <TabIcon routeName={route.name as keyof AppTabParamList} focused={focused} />
          ),
        })}
      >
        <Tab.Screen name="Goals" component={GoalsScreen} />
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarLabel: () => null,
            tabBarButton: (props) => (
              <Pressable {...props} testID="calendar-tab-button" style={[props.style, styles.calendarTabButton]} />
            ),
          }}
        />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Profile">
          {() => <ProfileScreen onPressSignOut={onPressSignOut} isSignOutPending={isSignOutPending} />}
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
  logoImage: {
    width: '100%',
    height: '100%',
  },
});