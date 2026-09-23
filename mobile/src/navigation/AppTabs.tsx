import {
  NavigationContainer,
  NavigationContainerRef,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateFabGroup } from '../components/presentation/CreateFabGroup';
import {
  CreateFabAction,
  CreateFabProvider,
  useRequiredCreateFab,
} from '../components/presentation/CreateFabContext';
import { AppIcon } from '../components/ui/AppIcon';
import { useTheme } from '../design/ThemeProvider';
import { useThemedStyles } from '../design/useThemedStyles';
import { AppIconName } from '../design/icons';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarSourcesScreen } from '../screens/CalendarSourcesScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { EventEditScreen } from '../screens/EventEditScreen';
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
import { LegalDocumentScreen } from '../screens/LegalDocumentScreen';
import { PremiumPaywallScreen } from '../screens/PremiumPaywallScreen';
import type { ProfileNavigationTarget, ProfileSection } from '../screens/ProfileScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import {
  AppTabParamList,
  CalendarStackParamList,
  NotesStackParamList,
  PlanStackParamList,
  ProfileStackParamList,
  RootStackParamList,
} from './navigationTypes';

type AppTabsProps = {
  onPressSignOut: () => Promise<void> | void;
  isSignOutPending: boolean;
};

const PlanStack = createNativeStackNavigator<PlanStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const NotesStack = createNativeStackNavigator<NotesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const DESKTOP_NAVIGATION_BREAKPOINT = 1024;
const EXIT_WARNING_WINDOW_MS = 2000;
export const DESKTOP_NAVIGATION_WIDTH = 152;

export function usesDesktopNavigation(platform: string, width: number): boolean {
  return platform === 'web' && width >= DESKTOP_NAVIGATION_BREAKPOINT;
}

const TAB_ICONS: Record<keyof AppTabParamList, AppIconName> = {
  Plan: 'plan',
  Calendar: 'calendar',
  Notes: 'note',
  Profile: 'profile',
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
  const iconColor = focused ? styles.activeIcon.color : styles.inactiveIcon.color;

  return (
    <View style={[styles.iconSlot, focused ? styles.iconSlotFocused : null]}>
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
      <CalendarStack.Screen name="EventEdit" component={EventEditScreen} />
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
    return function ProfileSectionRoute({
      navigation,
    }: {
      navigation: {
        goBack: () => void;
        navigate: (
          screen: ProfileNavigationTarget,
          params?: ProfileStackParamList[ProfileNavigationTarget],
        ) => void;
      };
    }) {
      return (
        <ProfileScreen
          onPressSignOut={onPressSignOut}
          isSignOutPending={isSignOutPending}
          section={section}
          onPressBack={navigation.goBack}
          navigation={{
            navigate: (screen, params) => navigation.navigate(screen, params),
          }}
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
              navigate: (screen, params) => navigation.navigate(screen, params),
              goBack: navigation.goBack,
            }}
          />
        )}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="PersonalInformation">
        {renderSection('account')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Security">{renderSection('security')}</ProfileStack.Screen>
      <ProfileStack.Screen name="Notifications">
        {renderSection('notifications')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="FocusPreferences">
        {renderSection('focusPreferences')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Appearance">{renderSection('appearance')}</ProfileStack.Screen>
      <ProfileStack.Screen name="DeviceCalendars">
        {renderSection('deviceCalendars')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="CalendarExport">
        {renderSection('calendarExport')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="TipsWisdom">{renderSection('tipsWisdom')}</ProfileStack.Screen>
      <ProfileStack.Screen name="AiCredits">{renderSection('aiCredits')}</ProfileStack.Screen>
      <ProfileStack.Screen name="DataExport">{renderSection('dataExport')}</ProfileStack.Screen>
      <ProfileStack.Screen name="DeleteAccount">
        {renderSection('deleteAccount')}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="PremiumPaywall" component={PremiumPaywallScreen} />
      <ProfileStack.Screen name="LegalDocument" component={LegalDocumentScreen} />
    </ProfileStack.Navigator>
  );
}

export function AppTabs({ onPressSignOut, isSignOutPending }: AppTabsProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDesktopNavigation = usesDesktopNavigation(Platform.OS, width);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRouteName, setActiveRouteName] = useState<keyof RootStackParamList>('Plan');
  const lastBackPressAt = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressAt.current < EXIT_WARNING_WINDOW_MS) {
        return false;
      }

      lastBackPressAt.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        const routeName = state?.routes?.[state.index ?? 0]?.name;
        setActiveRouteName((routeName as keyof RootStackParamList | undefined) ?? 'Plan');
      }}
    >
      <CreateFabProvider onCreate={(action) => navigateToCreate(navigationRef, action)}>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <RootStack.Screen name="Plan" component={PlanNavigator} />
          <RootStack.Screen name="Calendar" component={CalendarNavigator} />
          <RootStack.Screen name="Notes" component={NotesNavigator} />
          <RootStack.Screen name="Profile">
            {() => (
              <ProfileNavigator
                onPressSignOut={onPressSignOut}
                isSignOutPending={isSignOutPending}
              />
            )}
          </RootStack.Screen>
          <RootStack.Screen name="PremiumPaywall" component={PremiumPaywallScreen} />
          <RootStack.Screen name="LegalDocument" component={LegalDocumentScreen} />
        </RootStack.Navigator>
        <AppNavigationChrome
          insets={insets}
          isDesktopNavigation={isDesktopNavigation}
          activeRouteName={activeRouteName}
          navigation={navigationRef}
          styles={styles}
          theme={theme}
        />
      </CreateFabProvider>
    </NavigationContainer>
  );
}

function navigateToCreate(
  rootNavigation: NavigationContainerRef<RootStackParamList>,
  action: CreateFabAction,
): void {
  if (action === 'goal') {
    rootNavigation.navigate('Plan', { screen: 'CreateGoal' });
  } else if (action === 'task') {
    rootNavigation.navigate('Plan', { screen: 'CreateTask' });
  } else if (action === 'note') {
    rootNavigation.navigate('Notes', { screen: 'CreateNote' });
  } else if (action === 'focus') {
    rootNavigation.navigate('Plan', { screen: 'FocusMode' });
  } else {
    rootNavigation.navigate('Calendar', { screen: 'CreateEvent' });
  }
}

function AppNavigationChrome({
  insets,
  isDesktopNavigation,
  activeRouteName,
  navigation,
  styles,
  theme,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  isDesktopNavigation: boolean;
  activeRouteName: keyof RootStackParamList;
  navigation: NavigationContainerRef<RootStackParamList>;
  styles: ReturnType<typeof createStyles>;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const createFab = useRequiredCreateFab();
  const isProfileTabActive = activeRouteName === 'Profile';
  return (
    <>
      {isDesktopNavigation ? (
        <View style={styles.desktopNavigationOverlay}>
          {(['Plan', 'Calendar', 'Notes', 'Profile'] as const).map((destination) => (
            <Pressable
              key={destination}
              accessibilityRole="tab"
              accessibilityLabel={destination}
              accessibilityState={{ selected: activeRouteName === destination }}
              onPress={() => navigation.navigate(destination)}
              style={[
                styles.desktopTabBarItem,
                activeRouteName === destination ? styles.desktopTabBarItemActive : null,
              ]}
            >
              <TabIcon
                routeName={destination as keyof AppTabParamList}
                focused={activeRouteName === destination}
                isDesktop
              />
              <Text
                style={[
                  styles.desktopTabLabel,
                  {
                    color:
                      activeRouteName === destination
                        ? theme.colors.onBrand
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {destination}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!isProfileTabActive ? (
        <CreateFabGroup
          visible={createFab.visible}
          bottomOffset={insets.bottom + theme.spacing.md}
          rightOffset={theme.spacing.md}
          onPress={createFab.open}
          onDismiss={createFab.dismiss}
          onCreateGoal={() => createFab.create('goal')}
          onCreateTask={() => createFab.create('task')}
          onCreateNote={() => createFab.create('note')}
          onCreateEvent={() => createFab.create('event')}
          onCreateFocus={() => createFab.create('focus')}
        />
      ) : null}
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    tabBarLabel: {
      ...theme.typography.tabLabel,
    },
    desktopNavigationOverlay: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    desktopTabBarItemActive: {
      backgroundColor: theme.colors.brand,
    },
    webScene: {
      width: '100%',
      maxWidth: 860,
      alignSelf: 'center',
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
      color: theme.colors.onBrand,
    },
    inactiveIcon: {
      color: theme.colors.textSecondary,
    },
  });
