import { NavigationContainer, NavigationProp, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateFabGroup } from '../components/presentation/CreateFabGroup';
import { AppIcon } from '../components/ui/AppIcon';
import { useTheme } from '../design/ThemeProvider';
import { useThemedStyles } from '../design/useThemedStyles';
import { AppIconName } from '../design/icons';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarSourcesScreen } from '../screens/CalendarSourcesScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import {
  CreateEventScreen,
  CreateEventFromNoteScreen,
  CreateGoalScreen,
  CreateGoalFromNoteScreen,
  CreateNoteScreen,
  CreateTaskScreen,
  CreateTaskFromNoteScreen,
} from '../screens/CreationScreens';
import { GoalsScreen } from '../screens/GoalsScreen';
import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { FocusModeScreen } from '../screens/FocusModeScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { ProfileNavigationTarget, ProfileSection } from '../screens/ProfileScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import {
  AppTabParamList,
  CalendarStackParamList,
  NotesStackParamList,
  PlanStackParamList,
  ProfileStackParamList,
} from './navigationTypes';

type AppTabsProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const PlanStack = createNativeStackNavigator<PlanStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const NotesStack = createNativeStackNavigator<NotesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const DESKTOP_NAVIGATION_BREAKPOINT = 1024;
export const DESKTOP_NAVIGATION_WIDTH = 152;

export function usesDesktopNavigation(platform: string, width: number): boolean {
  return platform === 'web' && width >= DESKTOP_NAVIGATION_BREAKPOINT;
}

const TAB_ICONS: Record<keyof AppTabParamList, AppIconName> = {
  Plan: 'plan',
  Calendar: 'calendar',
  Create: 'create',
  Notes: 'note',
  Profile: 'profile',
};

function TabIcon({
  routeName,
  focused,
  isDesktop,
  createExpanded,
  dimmed,
}: {
  routeName: keyof AppTabParamList;
  focused: boolean;
  isDesktop: boolean;
  createExpanded: boolean;
  dimmed: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const rotation = useRef(new Animated.Value(0)).current;
  const iconColor = focused ? styles.activeIcon.color : styles.inactiveIcon.color;

  useEffect(() => {
    if (routeName !== 'Create') {
      return;
    }

    Animated.timing(rotation, {
      toValue: createExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [createExpanded, rotation, routeName]);

  if (routeName === 'Create') {
    const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

    return (
      <View style={styles.createIconCircle}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <AppIcon
            name={TAB_ICONS.Create}
            size={isDesktop ? 20 : 22}
            color={styles.createIcon.color}
            decorative
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconSlot,
        focused ? styles.iconSlotFocused : null,
        dimmed ? styles.iconSlotDimmed : null,
      ]}
    >
      <AppIcon
        name={TAB_ICONS[routeName]}
        size={isDesktop ? 20 : 22}
        color={iconColor}
        decorative
      />
    </View>
  );
}

function PlanNavigator() {
  return (
    <PlanStack.Navigator screenOptions={{ headerShown: false }}>
      <PlanStack.Screen name="PlanHome" component={PlanScreen} />
      <PlanStack.Screen name="Goals" component={GoalsScreen} />
      <PlanStack.Screen name="Tasks" component={TasksScreen} />
      <PlanStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <PlanStack.Screen name="FocusMode" component={FocusModeScreen} />
      <PlanStack.Screen name="CreateGoal" component={CreateGoalScreen} />
      <PlanStack.Screen name="CreateTask" component={CreateTaskScreen} />
    </PlanStack.Navigator>
  );
}

function CalendarNavigator() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarHome" component={CalendarScreen} />
      <CalendarStack.Screen name="EventDetail" component={EventDetailScreen} />
      <CalendarStack.Screen name="CalendarSources" component={CalendarSourcesScreen} />
      <CalendarStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <CalendarStack.Screen name="CreateTask" component={CreateTaskScreen} />
    </CalendarStack.Navigator>
  );
}

function NotesNavigator() {
  return (
    <NotesStack.Navigator screenOptions={{ headerShown: false }}>
      <NotesStack.Screen name="NotesHome" component={NotesScreen} />
      <NotesStack.Screen name="CreateNote" component={CreateNoteScreen} />
      <NotesStack.Screen name="NoteEditor" component={NoteEditorScreen} />
      <NotesStack.Screen name="CreateGoalFromNote" component={CreateGoalFromNoteScreen} />
      <NotesStack.Screen name="CreateTaskFromNote" component={CreateTaskFromNoteScreen} />
      <NotesStack.Screen name="CreateEventFromNote" component={CreateEventFromNoteScreen} />
    </NotesStack.Navigator>
  );
}

function ProfileNavigator({ onPressSignOut, isSignOutPending }: AppTabsProps) {
  function renderSection(section: ProfileSection) {
    return function ProfileSectionRoute({ navigation }: { navigation: { goBack: () => void } }) {
      return (
        <ProfileScreen
          onPressSignOut={onPressSignOut}
          isSignOutPending={isSignOutPending}
          section={section}
          onPressBack={navigation.goBack}
        />
      );
    };
  }

  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome">
        {({ navigation }) => (
          <ProfileScreen
            onPressSignOut={onPressSignOut}
            isSignOutPending={isSignOutPending}
            navigation={{
              navigate: (screen: ProfileNavigationTarget) => navigation.navigate(screen),
            }}
          />
        )}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="PersonalInformation">
        {renderSection('account')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Security">{renderSection('security')}</ProfileStack.Screen>
      <ProfileStack.Screen name="ConnectedServices">
        {renderSection('connectedServices')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Notifications">
        {renderSection('notifications')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="FocusPreferences">
        {renderSection('focusPreferences')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Appearance">{renderSection('appearance')}</ProfileStack.Screen>
      <ProfileStack.Screen name="PlanBilling">{renderSection('plan')}</ProfileStack.Screen>
      <ProfileStack.Screen name="Legal">{renderSection('legal')}</ProfileStack.Screen>
      <ProfileStack.Screen name="Subscription">{renderSection('subscription')}</ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}

function CreateTabScreen() {
  return null;
}

export function AppTabs({ onPressSignOut, isSignOutPending }: AppTabsProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDesktopNavigation = usesDesktopNavigation(Platform.OS, width);
  const [createVisible, setCreateVisible] = useState(false);

  return (
    <NavigationContainer>
      <AppTabsNavigator
        createVisible={createVisible}
        insets={insets}
        isDesktopNavigation={isDesktopNavigation}
        isSignOutPending={isSignOutPending}
        onPressSignOut={onPressSignOut}
        setCreateVisible={setCreateVisible}
        styles={styles}
        theme={theme}
      />
    </NavigationContainer>
  );
}

function AppTabsNavigator({
  createVisible,
  insets,
  isDesktopNavigation,
  isSignOutPending,
  onPressSignOut,
  setCreateVisible,
  styles,
  theme,
}: AppTabsProps & {
  createVisible: boolean;
  insets: ReturnType<typeof useSafeAreaInsets>;
  isDesktopNavigation: boolean;
  setCreateVisible: (visible: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();

  function navigateToCreate(action: 'goal' | 'task' | 'note' | 'event' | 'focus'): void {
    setCreateVisible(false);

    if (action === 'goal') {
      navigation.navigate('Plan', { screen: 'CreateGoal' });
    } else if (action === 'task') {
      navigation.navigate('Plan', { screen: 'CreateTask' });
    } else if (action === 'note') {
      navigation.navigate('Notes', { screen: 'NoteEditor' });
    } else if (action === 'focus') {
      navigation.navigate('Plan', { screen: 'FocusMode' });
    } else {
      navigation.navigate('Calendar', { screen: 'CreateEvent' });
    }
  }

  return (
    <>
      <Tab.Navigator
        initialRouteName="Plan"
        screenOptions={({ route }) => {
          const isDimmed = createVisible && route.name !== 'Create';

          return {
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
                  createVisible ? styles.tabBarDimmed : null,
                ],
            tabBarItemStyle: isDesktopNavigation ? styles.desktopTabBarItem : undefined,
            tabBarLabelStyle: [
              styles.tabBarLabel,
              isDesktopNavigation ? styles.desktopTabLabel : null,
              isDimmed ? styles.tabBarLabelDimmed : null,
            ],
            tabBarLabelPosition: isDesktopNavigation ? 'beside-icon' : 'below-icon',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                routeName={route.name as keyof AppTabParamList}
                focused={focused}
                isDesktop={isDesktopNavigation}
                createExpanded={route.name === 'Create' && createVisible}
                dimmed={isDimmed}
              />
            ),
          };
        }}
      >
        <Tab.Screen name="Plan" component={PlanNavigator} />
        <Tab.Screen name="Calendar" component={CalendarNavigator} />
        <Tab.Screen
          name="Create"
          component={CreateTabScreen}
          options={{
            tabBarLabel: () => null,
            tabBarButton: ({ children, accessibilityState, style }) => (
              <Pressable
                testID="create-tab-button"
                accessibilityRole="button"
                accessibilityLabel="Create"
                accessibilityState={accessibilityState}
                onPress={() => setCreateVisible(true)}
                style={[
                  style,
                  isDesktopNavigation ? styles.createRailButton : styles.createTabButton,
                ]}
              >
                {children}
              </Pressable>
            ),
          }}
        />
        <Tab.Screen name="Notes" component={NotesNavigator} />
        <Tab.Screen name="Profile">
          {() => (
            <ProfileNavigator onPressSignOut={onPressSignOut} isSignOutPending={isSignOutPending} />
          )}
        </Tab.Screen>
      </Tab.Navigator>
      <CreateFabGroup
        visible={createVisible}
        bottomOffset={theme.layout.tabBarHeight + insets.bottom + theme.spacing.sm}
        onDismiss={() => setCreateVisible(false)}
        onCreateGoal={() => navigateToCreate('goal')}
        onCreateTask={() => navigateToCreate('task')}
        onCreateNote={() => navigateToCreate('note')}
        onCreateEvent={() => navigateToCreate('event')}
        onCreateFocus={() => navigateToCreate('focus')}
      />
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    tabBar: {
      height: theme.layout.tabBarHeight,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.layout.tabBarPaddingVertical,
      backgroundColor: theme.colors.surfaceRaised,
      borderTopColor: theme.componentTokens.tabBar.borderTopColor,
      borderTopWidth: StyleSheet.hairlineWidth,
      overflow: 'visible',
      // React Navigation's default native drop shadow reads as a solid dark
      // band above the bar on Android's dark theme; the hairline border above is enough.
      elevation: 0,
      shadowOpacity: 0,
      shadowColor: 'transparent',
    },
    tabBarLabel: {
      ...theme.typography.tabLabel,
    },
    tabBarLabelDimmed: {
      opacity: 0.35,
    },
    tabBarDimmed: {
      backgroundColor: theme.colors.background,
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
    iconSlot: {
      width: theme.layout.tabIconSize,
      height: theme.layout.tabIconSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconSlotFocused: {
      opacity: 1,
    },
    iconSlotDimmed: {
      opacity: 0.35,
    },
    activeIcon: {
      color: theme.colors.brand,
    },
    inactiveIcon: {
      color: theme.colors.textSecondary,
    },
    createIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 32,
      backgroundColor: theme.componentTokens.tabIcon.focusedBackgroundColor,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createIcon: {
      color: theme.colors.onBrand,
    },
    createTabButton: {
      width: 112,
      height: theme.layout.tabBarHeight + 12,
      position: 'absolute',
      left: '50%',
      marginLeft: -56,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    createRailButton: {
      width: '100%',
      minHeight: 52,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
  });
