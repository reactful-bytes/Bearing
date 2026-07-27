import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { CalendarScreen } from '../screens/CalendarScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors, componentTokens, layout, typography } from '../design/tokens';

export type AppTabParamList = {
  Calendar: undefined;
  Goals: undefined;
  Notes: undefined;
  Profile: undefined;
};

type AppTabsProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICON_TEXT: Record<keyof AppTabParamList, string> = {
  Calendar: 'C',
  Goals: 'G',
  Notes: 'N',
  Profile: 'P',
};

function TabIcon({ routeName, focused }: { routeName: keyof AppTabParamList; focused: boolean }) {
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
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Goals" component={GoalsScreen} />
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
});