import { ReactNode, useMemo } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getEventKindLabel } from '../components/presentation/EventPresentation';
import { getGoalProgressPercent } from '../components/presentation/GoalPresentation';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { ProgressBar } from '../components/ui/ProgressBar';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { AppIcon } from '../components/ui/AppIcon';
import { useThemedStyles } from '../design/useThemedStyles';
import { useTheme } from '../design/ThemeProvider';
import type { Theme } from '../design/tokens';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { useFocusSession } from '../features/focus/focusSession';
import { useGoals } from '../features/goals/useGoals';
import { useNotes } from '../features/notes/useNotes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, TimeFormat, timeFormatOptions } from '../features/profile/timeFormat';
import { AppTabParamList, PlanStackParamList } from '../navigation/navigationTypes';

const MAX_TODAY_EVENTS = 3;
const MAX_ACTIVE_GOALS = 3;

const EMPTY_TODAY_PHRASES = [
  'Free as a bird',
  'Your calendar is taking a deep breath',
  'Wide-open skies ahead',
  'A little breathing room for you',
  'The day is yours to shape',
  'No meetings, no problem',
  'A blank canvas with excellent potential',
  'Room to roam, think, or make',
  'Today left the door unlocked',
  'Your schedule just winked at you',
  'Plenty of runway for something great',
  'The rare and beautiful empty calendar',
] as const;

const EMPTY_GOAL_PHRASES = [
  'No goals yet, only possibilities',
  'A clean slate is a powerful place to start',
  'Your next big thing is waiting for a name',
  'Room for a goal with your fingerprints on it',
  "Nothing on the board? Let's change that",
  'The goal-shaped space is all yours',
  'Every good plan starts with one brave idea',
  'Your future self would love a goal here',
  'A little ambition would look great here',
  'The starting line is wide open',
  'No goals means unlimited plot twists',
  'Make some room for what matters next',
] as const;

function getDailyPhrase(phrases: readonly string[], date: Date): string {
  return phrases[date.getDate() % phrases.length];
}

type PlanScreenProps = {
  navigation: NavigationProp<PlanStackParamList, 'PlanHome'>;
};

function getDayRange(date: Date): { start: Date; end: Date } {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  };
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatEventTime(
  event: CalendarDisplayEvent,
  locale: string,
  timeFormat: TimeFormat,
): string {
  if (event.allDay) return 'All day';

  return event.startAt.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(timeFormat),
  });
}

function PlanSurface({
  title,
  children,
  style,
  onPress,
  accessibilityLabel,
  bodyStyle,
  titlePlacement = 'inside',
  titleTone = 'brand',
  titleAlign = 'left',
}: {
  title: string;
  children: ReactNode;
  style?: object;
  onPress?: () => void;
  accessibilityLabel?: string;
  bodyStyle?: object;
  titlePlacement?: 'inside' | 'outside';
  titleTone?: 'brand' | 'focus' | 'warning';
  titleAlign?: 'left' | 'center';
}) {
  const styles = useThemedStyles(createStyles);
  const titleStyle = [
    styles.surfaceTitle,
    titleTone === 'focus'
      ? styles.surfaceTitleFocus
      : titleTone === 'warning'
        ? styles.surfaceTitleWarning
        : styles.surfaceTitleBrand,
    titleAlign === 'center' ? styles.surfaceTitleCentered : null,
  ];
  const titleElement = (
    <Text accessibilityRole="header" style={titleStyle}>
      {title}
    </Text>
  );

  return (
    <View style={[styles.surfaceShell, style]}>
      {titlePlacement === 'outside' ? titleElement : null}
      <View style={styles.surface}>
        {titlePlacement === 'inside' ? titleElement : null}
        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            style={({ pressed }) => [
              styles.surfaceBody,
              bodyStyle,
              pressed ? styles.pressed : null,
            ]}
          >
            {children}
          </Pressable>
        ) : (
          <View style={[styles.surfaceBody, bodyStyle]}>{children}</View>
        )}
      </View>
    </View>
  );
}

function PlanEventRow({
  event,
  dateTime,
  onPress,
  isLast,
  isNext,
}: {
  event: CalendarDisplayEvent;
  dateTime: string;
  onPress: () => void;
  isNext: boolean;
  isLast: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const accentStyle = event.ownership === 'device' ? styles.deviceAccent : styles.bearingAccent;

  return (
    <View style={styles.eventItem}>
      <View style={styles.timelineColumn}>
        <View
          style={[styles.timelineMarker, accentStyle, isNext ? styles.timelineMarkerNext : null]}
        />
        {!isLast ? <View style={styles.timelineConnector} /> : null}
      </View>
      <Card
        accessibilityLabel={`Open event ${event.title}`}
        onPress={onPress}
        variant="outlined"
        style={[styles.eventCard, accentStyle, isNext ? styles.nextEventCard : null]}
      >
        <Text numberOfLines={1} style={styles.eventTitle}>
          {event.title}
        </Text>
        <Text style={styles.eventMeta}>
          {dateTime} · {getEventKindLabel(event)}
        </Text>
      </Card>
    </View>
  );
}

type PlanScreenGoal = {
  title: string;
  status: 'active' | 'completed' | 'archived';
  completedStepCount: number;
  totalStepCount: number;
};

function PlanGoalRow({ goal, onPress }: { goal: PlanScreenGoal; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const progressPercent = getGoalProgressPercent(goal);

  return (
    <Pressable
      accessibilityLabel={`Open goal ${goal.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.goalRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.goalTitleRow}>
        <Text numberOfLines={1} style={styles.goalTitle}>
          {goal.title}
        </Text>
      </View>
      <ProgressBar
        accessibilityLabel={`Goal progress ${goal.title}`}
        accessibilityValueText={`${progressPercent}%`}
        value={progressPercent}
        style={styles.goalProgress}
      />
    </Pressable>
  );
}

export function PlanScreen({ navigation }: PlanScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const rootNavigation = useNavigation<NavigationProp<AppTabParamList>>();
  const today = useMemo(() => new Date(), []);
  const todayRange = useMemo(() => getDayRange(today), [today]);
  const { profile } = useUserProfile();
  const focusSession = useFocusSession();
  const { goals, uiState: goalsState, retry: retryGoals } = useGoals();
  const { notes, uiState: notesState, retry: retryNotes } = useNotes();
  const {
    events,
    uiState: eventsState,
    refresh: refreshEvents,
  } = useCalendarEvents(today, undefined, todayRange);
  const locale = profile?.locale ?? 'en-US';
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;
  const displayName = profile?.displayName?.trim();
  const greeting = getGreeting(new Date().getHours());
  const nowTimestamp = today.getTime();
  const emptyTodayPhrase = getDailyPhrase(EMPTY_TODAY_PHRASES, today);
  const emptyGoalPhrase = getDailyPhrase(EMPTY_GOAL_PHRASES, today);

  const todayEvents = useMemo(
    () =>
      [...events]
        .filter(
          (event) =>
            event.startAt >= todayRange.start &&
            event.startAt <= todayRange.end &&
            event.endAt.getTime() >= nowTimestamp,
        )
        .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
        .slice(0, MAX_TODAY_EVENTS),
    [events, nowTimestamp, todayRange],
  );
  const recentGoals = useMemo(
    () =>
      goals
        .filter((goal) => goal.status === 'active')
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .slice(0, MAX_ACTIVE_GOALS),
    [goals],
  );
  const currentEvent = useMemo(() => {
    return (
      todayEvents.find((event) => today >= event.startAt && today < event.endAt) ??
      todayEvents.find((event) => event.startAt > today) ??
      null
    );
  }, [today, todayEvents]);

  function openFocus(): void {
    if (focusSession) {
      rootNavigation.navigate('Plan', {
        screen: 'FocusMode',
        params: { eventId: focusSession.eventId },
      });
      return;
    }

    if (currentEvent) {
      rootNavigation.navigate('Plan', {
        screen: 'FocusMode',
        params: { eventId: currentEvent.id },
      });
      return;
    }

    rootNavigation.navigate('Plan', { screen: 'FocusMode' });
  }

  return (
    <AppScreen mode="scroll" testID="plan-screen" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <IconButton
          name="menu"
          accessibilityLabel="Open navigation"
          onPress={() => rootNavigation.navigate('Profile')}
          style={styles.headerAction}
        />
        <View pointerEvents="none" style={styles.brandMark}>
          <AppIcon name="bearingMark" size={128} decorative />
        </View>
        <IconButton
          name="more"
          accessibilityLabel="Open profile"
          onPress={() => rootNavigation.navigate('Profile')}
          style={styles.headerActionRight}
        />
      </View>

      <View style={styles.greetingBlock}>
        <Text accessibilityRole="header" style={styles.title}>
          {greeting}
          {displayName ? `, ${displayName}.` : '.'}
        </Text>
        <Text style={styles.subtitle}>Stay focused. Make it count.</Text>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.surfaceRow}>
          <PlanSurface
            title="TODAY'S PLAN"
            titlePlacement="outside"
            style={styles.todaySurface}
            bodyStyle={styles.eventListBody}
          >
            {eventsState === 'loading' ? (
              <AppCard>
                <Text style={styles.stateTitle}>Loading today&apos;s events...</Text>
              </AppCard>
            ) : null}
            {eventsState === 'error' ? (
              <RecoveryCard
                title="Unable to load today's events."
                description="Check your connection, then retry."
                onRetry={() => void refreshEvents()}
              />
            ) : null}
            {eventsState === 'empty' || (eventsState === 'ready' && todayEvents.length === 0) ? (
              <EmptyState
                icon="calendar"
                title={emptyTodayPhrase}
                description="Your calendar is clear. Use Create to shape the day."
                presentation="compact"
              />
            ) : null}
            {eventsState === 'ready'
              ? todayEvents.map((event, index) => (
                  <PlanEventRow
                    key={`${event.ownership}-${event.id}`}
                    event={event}
                    dateTime={formatEventTime(event, locale, timeFormat)}
                    onPress={() => rootNavigation.navigate('Calendar', { screen: 'CalendarHome' })}
                    isNext={index === 0}
                    isLast={index === todayEvents.length - 1}
                  />
                ))
              : null}
          </PlanSurface>

          <PlanSurface
            title="FOCUS MODE"
            titleTone="focus"
            titleAlign="center"
            accessibilityLabel="Open Focus Mode"
            onPress={openFocus}
            style={styles.focusSurface}
          >
            <View style={styles.centeredSurfaceContent}>
              <AppIcon name="focus" size={96} color={theme.colors.focusGreen} decorative />
              <Text style={styles.focusStatus}>{focusSession ? 'ACTIVE' : 'READY'}</Text>
              <Text style={styles.focusDescription}>
                {focusSession ? 'Distractions blocked' : 'Start a focused session'}
              </Text>
            </View>
          </PlanSurface>
        </View>

        <View style={styles.surfaceRow}>
          <PlanSurface title="GOALS" titlePlacement="outside" style={styles.goalsSurface}>
            {goalsState === 'loading' ? (
              <AppCard>
                <Text style={styles.stateTitle}>Loading goals...</Text>
              </AppCard>
            ) : null}
            {goalsState === 'error' ? (
              <RecoveryCard
                title="Unable to load goals."
                description="Check your connection, then retry."
                onRetry={retryGoals}
              />
            ) : null}
            {goalsState === 'empty' || (goalsState === 'ready' && recentGoals.length === 0) ? (
              <EmptyState
                icon="goal"
                title={emptyGoalPhrase}
                description="Create a goal to give your next steps a home."
                presentation="compact"
                actionLabel="Open goals"
                onPressAction={() => navigation.navigate('Goals')}
              />
            ) : null}
            {goalsState === 'ready'
              ? recentGoals.map((goal) => (
                  <PlanGoalRow
                    key={goal.id}
                    goal={goal}
                    onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
                  />
                ))
              : null}
          </PlanSurface>

          <PlanSurface
            title="IDEA DUMP"
            titleTone="warning"
            titleAlign="center"
            accessibilityLabel="Open Notes"
            onPress={() =>
              rootNavigation.navigate('Notes', {
                screen: 'NotesHome',
                params: { createNote: true },
              })
            }
            style={styles.ideaSurface}
          >
            <View style={styles.centeredSurfaceContent}>
              <AppIcon name="idea" size={96} color={theme.colors.warning} decorative />
              <View style={styles.ideaCopy}>
                {notesState === 'loading' ? (
                  <Text style={styles.cardTitle}>Checking your notes...</Text>
                ) : null}
                {notesState === 'error' ? (
                  <RecoveryCard
                    title="Notes are unavailable"
                    description="Check your connection, then retry."
                    onRetry={retryNotes}
                  />
                ) : null}
                {notesState === 'empty' || notesState === 'ready' ? (
                  <Text style={styles.ideaCount}>
                    {notes.filter((note) => note.source === 'idea_dump').length}
                  </Text>
                ) : null}
                <Text style={styles.cardDescription}>Ideas captured from Notes.</Text>
                <Text style={styles.ideaCta}>Review in Notes ›</Text>
              </View>
            </View>
          </PlanSurface>
        </View>
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing['3xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      position: 'relative',
    },
    headerAction: { marginLeft: -theme.spacing.sm },
    headerActionRight: { marginLeft: 'auto' },
    brandMark: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...theme.typography.sectionTitle, color: theme.colors.text },
    subtitle: { ...theme.typography.helper, color: theme.colors.textSecondary },
    greetingBlock: { gap: theme.spacing.xs, alignItems: 'center', paddingVertical: theme.spacing.xs },
    dashboardGrid: { gap: theme.spacing.xl },
    surfaceRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.md,
    },
    surfaceShell: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs,
    },
    surface: {
      flexGrow: 1,
      minWidth: 0,
      minHeight: 184,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    surfaceTitle: { ...theme.typography.label },
    surfaceTitleBrand: { color: theme.colors.brand },
    surfaceTitleFocus: { color: theme.colors.focusGreen },
    surfaceTitleWarning: { color: theme.colors.warning },
    surfaceTitleCentered: { textAlign: 'center' },
    surfaceBody: { flex: 1, gap: theme.spacing.sm },
    centeredSurfaceContent: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    pressed: { opacity: 0.82 },
    todaySurface: { flex: 1.6, minHeight: 214 },
    focusSurface: {},
    goalsSurface: { flex: 1.6, minHeight: 202 },
    ideaSurface: {},
    eventListBody: { gap: 0 },
    eventItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.sm,
    },
    timelineColumn: { width: 12, alignItems: 'center' },
    timelineMarker: {
      width: 9,
      height: 9,
      marginTop: theme.spacing.md,
      borderRadius: 5,
      borderWidth: 2,
      backgroundColor: theme.colors.background,
    },
    timelineMarkerNext: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    timelineConnector: {
      flex: 1,
      width: 1,
      marginVertical: theme.spacing.xs,
      backgroundColor: theme.colors.border,
    },
    eventCard: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderLeftWidth: 2,
    },
    nextEventCard: {
      backgroundColor: theme.colors.surfaceBrand,
      borderColor: theme.colors.success,
      borderLeftColor: theme.colors.success,
    },
    bearingAccent: { borderLeftColor: theme.colors.brand },
    deviceAccent: { borderLeftColor: theme.colors.textSecondary },
    eventTitle: { ...theme.typography.helper, color: theme.colors.text, fontWeight: '600' },
    eventMeta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    goalRow: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    goalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    goalTitle: { ...theme.typography.helper, color: theme.colors.text, flex: 1 },
    goalProgress: { minHeight: 4 },
    focusStatus: {
      ...theme.typography.label,
      color: theme.colors.focusGreen,
      textAlign: 'center',
    },
    focusDescription: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    ideaCopy: { width: '100%', alignItems: 'center', gap: theme.spacing.xs },
    ideaCount: {
      ...theme.typography.sectionTitle,
      color: theme.colors.text,
      textAlign: 'center',
    },
    cardTitle: { ...theme.typography.helper, color: theme.colors.text, textAlign: 'center' },
    cardDescription: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    ideaCta: {
      ...theme.typography.caption,
      color: theme.colors.warning,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },
    stateTitle: { ...theme.typography.helper, color: theme.colors.text },
  });
