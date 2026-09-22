import { ReactNode, useMemo } from 'react';
import { NavigationProp } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGoalProgressPercent } from '../components/presentation/GoalPresentation';
import { AppScreen } from '../components/ui/AppScreen';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { AppIcon } from '../components/ui/AppIcon';
import { useThemedStyles } from '../design/useThemedStyles';
import { useTheme } from '../design/ThemeProvider';
import type { AppIconName } from '../design/icons';
import type { Theme } from '../design/tokens';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { useFocusSession } from '../features/focus/focusSession';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { TaskRecord } from '../features/tasks/taskTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, TimeFormat, timeFormatOptions } from '../features/profile/timeFormat';
import { PlanStackParamList } from '../navigation/navigationTypes';

const MAX_UPCOMING_EVENTS = 3;
const MAX_ACTIVE_GOALS = 3;

const EMPTY_UPCOMING_PHRASES = [
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

type PlanPageNavigation = {
  navigate: (screen: 'Calendar' | 'Notes' | 'Profile', params?: Record<string, unknown>) => void;
};

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

function formatEventDuration(event: CalendarDisplayEvent): string {
  if (event.allDay) return 'All day';

  const totalMinutes = Math.max(
    0,
    Math.round((event.endAt.getTime() - event.startAt.getTime()) / 60_000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${hours} hr${hours === 1 ? '' : 's'} ${minutes} min`;
}

function getEventCalendarLabel(event: CalendarDisplayEvent): string {
  return event.ownership === 'bearing' ? 'Bearing' : event.calendarTitle;
}

function PlanSkeleton({ rows = 3 }: { rows?: number }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityLabel="Loading" style={styles.skeletonList}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonMarker} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, styles.skeletonLinePrimary]} />
            <View style={[styles.skeletonLine, styles.skeletonLineSecondary]} />
          </View>
        </View>
      ))}
    </View>
  );
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
  titleIcon,
  titleIconColor,
  titleAction,
  footer,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  style?: object;
  onPress?: () => void;
  accessibilityLabel?: string;
  bodyStyle?: object;
  titlePlacement?: 'inside' | 'outside' | 'hidden';
  titleTone?: 'brand' | 'focus' | 'warning';
  titleAlign?: 'left' | 'center';
  titleIcon?: AppIconName;
  titleIconColor?: string;
  titleAction?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const titleStyle = [
    styles.surfaceTitle,
    titleTone === 'focus'
      ? styles.surfaceTitleFocus
      : titleTone === 'warning'
        ? styles.surfaceTitleWarning
        : styles.surfaceTitleBrand,
    titleAlign === 'center' ? styles.surfaceTitleCentered : null,
  ];
  const resolvedTitleIconColor =
    titleIconColor ??
    (titleTone === 'focus'
      ? theme.colors.focusGreen
      : titleTone === 'warning'
        ? theme.colors.warning
        : theme.colors.brand);
  const titleElement = (
    <Text accessibilityRole="header" style={titleStyle}>
      {title}
    </Text>
  );

  return (
    <View style={[styles.surfaceShell, style]}>
      {titlePlacement === 'outside' ? (
        <View style={styles.surfaceTitleRow}>
          <View style={styles.surfaceTitleContent}>
            {titleIcon ? (
              <AppIcon name={titleIcon} size={22} color={resolvedTitleIconColor} decorative />
            ) : null}
            {titleElement}
          </View>
          {titleAction}
        </View>
      ) : null}
      <View style={[styles.surface, compact ? styles.compactSurfaceInner : null]}>
        {titlePlacement === 'inside' ? (
          <View style={styles.surfaceTitleRow}>
            <View style={styles.surfaceTitleContent}>
              {titleIcon ? (
                <AppIcon name={titleIcon} size={22} color={resolvedTitleIconColor} decorative />
              ) : null}
              {titleElement}
            </View>
            {titleAction}
          </View>
        ) : null}
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
        {footer ? <View style={styles.surfaceFooter}>{footer}</View> : null}
      </View>
    </View>
  );
}

function PlanEventRow({
  event,
  dateTime,
  onPress,
  dateLabel,
  isLast,
}: {
  event: CalendarDisplayEvent;
  dateTime: string;
  onPress: () => void;
  dateLabel?: string;
  isLast: boolean;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`Open event ${event.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.eventItem, pressed ? styles.pressed : null]}
    >
      <View style={styles.eventTimeColumn}>
        {dateLabel ? <Text style={styles.eventDateLabel}>{dateLabel}</Text> : null}
        <Text style={styles.eventTime}>{dateTime}</Text>
      </View>
      <View style={styles.timelineColumn}>
        <View style={styles.timelineMarker} />
        {!isLast ? <View style={styles.timelineConnector} /> : null}
      </View>
      <View style={styles.eventCard}>
        <View style={styles.eventTitleRow}>
          <Text numberOfLines={1} style={styles.eventTitle}>
            {event.title}
          </Text>
        </View>
        <Text style={styles.eventMeta}>
          {getEventCalendarLabel(event)} · {formatEventDuration(event)}
        </Text>
      </View>
    </Pressable>
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
        <Text style={styles.goalProgressText}>{progressPercent}%</Text>
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

function PlanTaskRow({
  task,
  context,
  onPress,
}: {
  task: TaskRecord;
  context: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      testID={`plan-task-${task.id}`}
      accessibilityLabel={`Open task ${task.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.taskRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.taskMarker} />
      <View style={styles.taskCopy}>
        <Text numberOfLines={1} style={styles.taskTitle}>
          {task.title}
        </Text>
        <Text numberOfLines={1} style={styles.taskContext}>
          {context}
        </Text>
      </View>
    </Pressable>
  );
}

export function PlanScreen({ navigation }: PlanScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { theme, preference } = useTheme();
  const insets = useSafeAreaInsets();
  const pageNavigation = navigation.getParent?.() as PlanPageNavigation | undefined;
  const today = useMemo(() => new Date(), []);
  const { profile } = useUserProfile();
  const focusSession = useFocusSession();
  const { goals, uiState: goalsState, retry: retryGoals } = useGoals();
  const { tasks, uiState: tasksState, retry: retryTasks } = useTasks();
  const { events, uiState: eventsState, refresh: refreshEvents } = useCalendarEvents(today);
  const locale = profile?.locale ?? 'en-US';
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;
  const displayName = profile?.displayName?.trim();
  const firstName = displayName?.split(/\s+/)[0];
  const greeting = getGreeting(new Date().getHours());
  const nowTimestamp = today.getTime();
  const emptyUpcomingPhrase = getDailyPhrase(EMPTY_UPCOMING_PHRASES, today);
  const emptyGoalPhrase = getDailyPhrase(EMPTY_GOAL_PHRASES, today);

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((event) => event.endAt.getTime() > nowTimestamp)
        .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
        .slice(0, MAX_UPCOMING_EVENTS),
    [events, nowTimestamp],
  );
  const recentGoals = useMemo(
    () =>
      goals
        .filter((goal) => goal.status === 'active')
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .slice(0, MAX_ACTIVE_GOALS),
    [goals],
  );
  const taskSummary = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status === 'active');
    const focusEvent = focusSession
      ? events.find((event) => event.id === focusSession.eventId)
      : undefined;
    const focusTaskId = focusEvent?.ownership === 'bearing' ? focusEvent.sourceTaskId : null;
    const focusTask = focusTaskId
      ? (activeTasks.find((task) => task.id === focusTaskId) ?? null)
      : null;
    const nextGoalTasks = recentGoals
      .map((goal) =>
        goal.nextStep
          ? (activeTasks.find((task) => task.stepId === goal.nextStep?.id) ?? null)
          : null,
      )
      .filter((task): task is TaskRecord => task !== null);
    const recentTasks = [...activeTasks].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    );

    return [focusTask, ...nextGoalTasks, ...recentTasks]
      .filter((task): task is TaskRecord => task !== null)
      .filter(
        (task, index, allTasks) =>
          allTasks.findIndex((candidate) => candidate.id === task.id) === index,
      )
      .slice(0, 3);
  }, [events, focusSession, recentGoals, tasks]);
  const currentEvent = useMemo(() => {
    return (
      upcomingEvents.find((event) => today >= event.startAt && today < event.endAt) ??
      upcomingEvents.find((event) => event.startAt > today) ??
      null
    );
  }, [today, upcomingEvents]);

  function openFocus(): void {
    if (focusSession) {
      navigation.navigate('FocusMode', { eventId: focusSession.eventId });
      return;
    }

    if (currentEvent) {
      navigation.navigate('FocusMode', { eventId: currentEvent.id });
      return;
    }

    navigation.navigate('FocusMode');
  }

  return (
    <AppScreen
      mode="scroll"
      testID="plan-screen"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: theme.spacing['3xl'] + insets.bottom },
      ]}
      backgroundSource={
        preference === 'dark'
          ? require('../../assets/topographic-dark.png')
          : require('../../assets/topographic-light.png')
      }
      backgroundImageStyle={styles.topographicImage}
    >
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <AppIcon name="bearingMark" size={104} decorative />
        </View>
        <View style={styles.greetingBlock}>
          <Text accessibilityRole="header" style={styles.greeting}>
            {greeting},
          </Text>
          {firstName ? <Text style={styles.title}>{firstName}</Text> : null}
          <Text style={styles.subtitle}>Stay focused. Make it count.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => pageNavigation?.navigate('Profile')}
          style={({ pressed }) => [styles.profileButton, pressed ? styles.pressed : null]}
        >
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{firstName?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.surfaceRow}>
          <PlanSurface
            title="Upcoming"
            titlePlacement="inside"
            titleIcon="calendar"
            titleIconColor={theme.colors.purple}
            footer={
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="View full day"
                onPress={() =>
                  pageNavigation?.navigate('Calendar', {
                    screen: 'CalendarHome',
                    params: { dateIso: new Date().toISOString() },
                  })
                }
                style={({ pressed }) => [styles.surfaceFooterLink, pressed ? styles.pressed : null]}
              >
                <Text style={styles.surfaceFooterText}>View full day</Text>
                <AppIcon name="next" size={18} color={theme.colors.brand} decorative />
              </Pressable>
            }
            style={styles.todaySurface}
            bodyStyle={styles.eventListBody}
          >
            {eventsState === 'loading' ? <PlanSkeleton /> : null}
            {eventsState === 'error' ? (
              <RecoveryCard
                title="Unable to load upcoming events."
                description="Check your connection, then retry."
                onRetry={() => void refreshEvents()}
              />
            ) : null}
            {eventsState === 'empty' || (eventsState === 'ready' && upcomingEvents.length === 0) ? (
              <EmptyState
                title={emptyUpcomingPhrase}
                description="Add something new to shape what comes next."
                presentation="compact"
                style={styles.emptyUpcoming}
              />
            ) : null}
            {eventsState === 'ready'
              ? upcomingEvents.map((event, index) => (
                  <PlanEventRow
                    key={`${event.ownership}-${event.id}`}
                    event={event}
                    dateTime={formatEventTime(event, locale, timeFormat)}
                    dateLabel={
                      index === 0 ||
                      event.startAt.toDateString() !==
                        upcomingEvents[index - 1].startAt.toDateString()
                        ? event.startAt.toLocaleDateString(locale, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })
                        : undefined
                    }
                    onPress={() =>
                      pageNavigation?.navigate('Calendar', {
                        screen: 'CalendarHome',
                        params: { dateIso: event.startAt.toISOString() },
                      })
                    }
                    isLast={index === upcomingEvents.length - 1}
                  />
                ))
              : null}
          </PlanSurface>
        </View>

        <View style={styles.surfaceRow}>
          <PlanSurface
            title="FOCUS MODE"
            titleTone="focus"
            titlePlacement="hidden"
            accessibilityLabel="Open Focus Mode"
            onPress={openFocus}
            style={styles.compactSurface}
            bodyStyle={[styles.compactSurfaceBody, styles.focusSurfaceBody]}
            compact
          >
            <View style={styles.compactSurfaceContent}>
              <AppIcon name="focus" size={28} color={theme.colors.focusGreen} decorative />
              <Text numberOfLines={1} style={styles.compactSurfaceLabel}>
                Focus Mode
              </Text>
              <Text style={styles.compactSurfaceDescription}>
                Block distractions and get things done
              </Text>
              <View style={styles.compactSurfaceChevron}>
                <AppIcon name="next" size={18} color={theme.colors.focusGreen} decorative />
              </View>
            </View>
          </PlanSurface>
          <PlanSurface
            title="NOTES"
            titlePlacement="hidden"
            accessibilityLabel="Open Notes"
            onPress={() => pageNavigation?.navigate('Notes', { screen: 'NotesHome' })}
            style={styles.compactSurface}
            bodyStyle={[styles.compactSurfaceBody, styles.notesSurfaceBody]}
            compact
          >
            <View style={styles.compactSurfaceContent}>
              <AppIcon name="notes" size={28} color={theme.colors.warning} decorative />
              <Text numberOfLines={1} style={styles.compactSurfaceLabel}>
                Notes
              </Text>
              <Text style={styles.compactSurfaceDescription}>
                Capture thoughts before they&apos;re gone
              </Text>
              <View style={styles.compactSurfaceChevron}>
                <AppIcon name="next" size={18} color={theme.colors.warning} decorative />
              </View>
            </View>
          </PlanSurface>
        </View>

        <PlanSurface
          title="Goals"
          titlePlacement="inside"
          titleIcon="goal"
          titleIconColor={theme.colors.success}
          footer={
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="See all"
              onPress={() => navigation.navigate('Goals')}
              style={({ pressed }) => [styles.surfaceFooterLink, pressed ? styles.pressed : null]}
            >
              <Text style={styles.surfaceFooterText}>See all</Text>
              <AppIcon name="next" size={18} color={theme.colors.brand} decorative />
            </Pressable>
          }
          style={styles.goalsSurface}
        >
          {goalsState === 'loading' ? <PlanSkeleton rows={3} /> : null}
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
          title="Tasks"
          titleIcon="tasks"
          titleIconColor={theme.colors.brand}
          accessibilityLabel="Open Tasks"
          onPress={() => navigation.navigate('Tasks')}
          footer={
            <Pressable
              testID="tasks-see-all"
              accessibilityRole="link"
              accessibilityLabel="See all tasks"
              onPress={() => navigation.navigate('Tasks')}
              style={({ pressed }) => [styles.surfaceFooterLink, pressed ? styles.pressed : null]}
            >
              <Text style={styles.surfaceFooterText}>See all</Text>
              <AppIcon name="next" size={18} color={theme.colors.brand} decorative />
            </Pressable>
          }
          style={styles.tasksSurface}
        >
          {tasksState === 'loading' ? <PlanSkeleton rows={2} /> : null}
          {tasksState === 'error' ? (
            <RecoveryCard
              title="Unable to load tasks."
              description="Check your connection, then retry."
              onRetry={retryTasks}
            />
          ) : null}
          {tasksState === 'empty' || (tasksState === 'ready' && taskSummary.length === 0) ? (
            <EmptyState
              title="Turn intentions into action"
              description="Review and complete your next steps"
              presentation="compact"
              style={styles.emptyTasks}
            />
          ) : null}
          {tasksState === 'ready'
            ? taskSummary.map((task) => (
                <PlanTaskRow
                  key={task.id}
                  task={task}
                  context={
                    focusSession &&
                    events.some(
                      (event) =>
                        event.id === focusSession.eventId &&
                        event.ownership === 'bearing' &&
                        event.sourceTaskId === task.id,
                    )
                      ? 'In focus mode'
                      : (goals.find((goal) => goal.id === task.goalId)?.title ?? 'Recent task')
                  }
                  onPress={() => navigation.navigate('Tasks')}
                />
              ))
            : null}
        </PlanSurface>
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing['3xl'],
    },
    topographicImage: {
      opacity: 0.16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: 64,
      position: 'relative',
    },
    brandMark: {
      flexShrink: 0,
      marginTop: -10,
      marginLeft: -10,
    },
    profileButton: {
      marginLeft: theme.spacing.md,
      minWidth: theme.layout.minimumTouchTarget,
      minHeight: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    avatarPlaceholder: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.brand,
    },
    avatarInitial: { ...theme.typography.cardTitle, color: theme.colors.surface },
    title: { ...theme.typography.screenTitle, color: theme.colors.text },
    greeting: {
      ...theme.typography.cardTitle,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    subtitle: { ...theme.typography.helper, lineHeight: 22, color: theme.colors.textSecondary },
    greetingBlock: {
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
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
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.06)',
      overflow: 'hidden',
    },
    surfaceTitle: {
      ...theme.typography.cardTitle,
      color: theme.colors.text,
      textTransform: 'none',
    },
    surfaceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    surfaceTitleContent: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    surfaceTitleBrand: { color: theme.colors.text },
    surfaceTitleFocus: { color: theme.colors.text },
    surfaceTitleWarning: { color: theme.colors.text },
    surfaceTitleCentered: { textAlign: 'center' },
    surfaceBody: { flex: 1, gap: theme.spacing.sm },
    surfaceFooter: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginBottom: -theme.spacing.lg,
    },
    surfaceFooterLink: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    surfaceFooterText: { ...theme.typography.helper, color: theme.colors.brand, fontWeight: '700' },
    surfaceLink: { alignSelf: 'flex-end', paddingVertical: theme.spacing.xs },
    surfaceLinkText: { ...theme.typography.caption, color: theme.colors.brand, fontWeight: '700' },
    pressed: { opacity: 0.82 },
    emptyUpcoming: { alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' },
    emptyTasks: { alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' },
    todaySurface: { flex: 1.6, minHeight: 214 },
    compactSurface: { minHeight: 88 },
    compactSurfaceInner: { minHeight: 0, paddingVertical: theme.spacing.md },
    compactSurfaceBody: {
      position: 'relative',
      justifyContent: 'center',
      marginHorizontal: -theme.spacing.lg,
      marginVertical: -theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    compactSurfaceContent: {
      alignItems: 'flex-start',
      width: '100%',
      gap: theme.spacing.xs,
    },
    compactSurfaceChevron: { alignSelf: 'flex-end' },
    compactSurfaceLabel: { ...theme.typography.cardTitle, color: theme.colors.text },
    compactSurfaceDescription: { ...theme.typography.caption, color: theme.colors.textSecondary },
    focusSurfaceBody: { backgroundColor: `${theme.colors.focusGreen}18` },
    notesSurfaceBody: { backgroundColor: `${theme.colors.warning}18` },
    goalsSurface: { minHeight: 202 },
    tasksSurface: { minHeight: 148 },
    taskRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    taskMarker: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.colors.borderStrong,
    },
    taskCopy: { flex: 1, gap: theme.spacing.xs },
    taskTitle: { ...theme.typography.helper, color: theme.colors.text, fontWeight: '600' },
    taskContext: { ...theme.typography.caption, color: theme.colors.textSecondary },
    goalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalsHeaderSpacer: { flex: 1 },
    eventListBody: { gap: 0 },
    eventItem: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    eventTimeColumn: {
      width: 72,
      alignItems: 'flex-end',
      gap: theme.spacing.xs / 2,
    },
    eventTime: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'right',
    },
    timelineColumn: { width: 8, alignItems: 'center', position: 'relative' },
    timelineMarker: {
      width: 12,
      height: 12,
      marginTop: theme.spacing.xs,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.colors.borderStrong,
    },
    timelineConnector: {
      position: 'absolute',
      top: theme.spacing.xs + 14,
      bottom: -10,
      width: 1.5,
      backgroundColor: theme.colors.borderStrong,
    },
    eventCard: {
      flex: 1,
      justifyContent: 'flex-start',
      gap: theme.spacing.xs,
      alignSelf: 'flex-start',
      marginTop: -2,
    },
    eventTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    eventTitle: {
      ...theme.typography.helper,
      color: theme.colors.text,
      fontWeight: '600',
      flex: 1,
    },
    eventMeta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    eventDateLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      flexShrink: 0,
    },
    goalRow: {
      flex: 1,
      justifyContent: 'flex-start',
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
    goalProgressText: { ...theme.typography.caption, color: theme.colors.textSecondary },
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
    skeletonList: { gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    skeletonMarker: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonCopy: { flex: 1, gap: theme.spacing.xs },
    skeletonLine: {
      height: 10,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonLinePrimary: { width: '72%' },
    skeletonLineSecondary: { width: '42%', height: 8 },
  });
