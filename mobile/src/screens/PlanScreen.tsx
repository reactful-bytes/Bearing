import { ReactNode, useMemo } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EventRow } from '../components/presentation/EventPresentation';
import { GoalCard } from '../components/presentation/GoalPresentation';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { EmptyState } from '../components/ui/EmptyState';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { AppIcon } from '../components/ui/AppIcon';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { useFocusSession } from '../features/focus/focusSession';
import { useGoals } from '../features/goals/useGoals';
import { useNotes } from '../features/notes/useNotes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, TimeFormat, timeFormatOptions } from '../features/profile/timeFormat';
import {
  AppTabParamList,
  CalendarFocusLaunch,
  PlanStackParamList,
} from '../navigation/navigationTypes';

const MAX_TODAY_EVENTS = 5;
const MAX_ACTIVE_GOALS = 3;

type PlanScreenProps = {
  navigation: NavigationProp<PlanStackParamList, 'Plan'>;
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

function formatFocusTimeRemaining(endAt: Date): string {
  const totalSeconds = Math.max(0, Math.ceil((endAt.getTime() - Date.now()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} remaining`;
}

function toFocusLaunch(event: CalendarDisplayEvent): CalendarFocusLaunch {
  return {
    token: `${event.id}-${event.startAt.getTime()}`,
    eventId: event.id,
    title: event.title,
    description: event.description,
    startAtIso: event.startAt.toISOString(),
    endAtIso: event.endAt.toISOString(),
    timezone: event.timezone,
  };
}

function PlanSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function PlanScreen({ navigation }: PlanScreenProps) {
  const styles = useThemedStyles(createStyles);
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

  const todayEvents = useMemo(
    () =>
      [...events]
        .filter((event) => event.startAt >= todayRange.start && event.startAt <= todayRange.end)
        .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
        .slice(0, MAX_TODAY_EVENTS),
    [events, todayRange],
  );
  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'active').slice(0, MAX_ACTIVE_GOALS),
    [goals],
  );
  const currentEvent = useMemo(() => {
    const now = new Date();
    return (
      todayEvents.find((event) => now >= event.startAt && now < event.endAt) ??
      todayEvents.find((event) => event.startAt > now) ??
      null
    );
  }, [todayEvents]);

  function openFocus(): void {
    if (focusSession) {
      rootNavigation.navigate('Calendar');
      return;
    }

    if (currentEvent) {
      rootNavigation.navigate('Calendar', {
        screen: 'Calendar',
        params: { focusLaunch: toFocusLaunch(currentEvent) },
      });
      return;
    }

    rootNavigation.navigate('Calendar');
  }

  return (
    <AppScreen mode="scroll" testID="plan-screen" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Plan</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {greeting}
            {displayName ? `, ${displayName}` : ''}
          </Text>
          <Text style={styles.subtitle}>Your day, your direction, one clear next step.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => rootNavigation.navigate('Profile')}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{(displayName || '?').charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      <PlanSection
        title="Today's plan"
        action={
          <AppButton
            label="More events"
            variant="secondary"
            onPress={() => rootNavigation.navigate('Calendar')}
          />
        }
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
            title="Nothing scheduled today"
            description="Your calendar is clear. Use Create to shape the day."
            presentation="compact"
          />
        ) : null}
        {eventsState === 'ready'
          ? todayEvents.map((event) => (
              <EventRow
                key={`${event.ownership}-${event.id}`}
                event={event}
                dateTime={formatEventTime(event, locale, timeFormat)}
                timezone={event.timezone}
                onPress={() => rootNavigation.navigate('Calendar', { screen: 'Calendar' })}
              />
            ))
          : null}
      </PlanSection>

      <PlanSection title="Focus mode">
        <AppCard style={styles.focusCard}>
          <View style={styles.focusIcon}>
            <AppIcon name="focus" size={28} decorative />
          </View>
          <View style={styles.focusCopy}>
            <Text style={styles.cardTitle}>
              {focusSession
                ? `Focus active: ${focusSession.title}`
                : currentEvent
                  ? `Focus on ${currentEvent.title}`
                  : 'No active focus session'}
            </Text>
            <Text style={styles.cardDescription}>
              {focusSession
                ? formatFocusTimeRemaining(focusSession.endAt)
                : currentEvent
                  ? 'Give the next block your full attention.'
                  : 'Start with the next thing that matters.'}
            </Text>
          </View>
          <AppButton
            label={focusSession ? 'Open Focus' : currentEvent ? 'Focus' : 'Start Focus'}
            onPress={openFocus}
          />
        </AppCard>
      </PlanSection>

      <PlanSection
        title="Active goals"
        action={
          <AppButton
            label="View all"
            variant="secondary"
            onPress={() => navigation.navigate('Goals')}
          />
        }
      >
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
        {goalsState === 'empty' || (goalsState === 'ready' && activeGoals.length === 0) ? (
          <EmptyState
            icon="goal"
            title="No active goals"
            description="Create a goal to give your next steps a home."
            presentation="compact"
            actionLabel="Open goals"
            onPressAction={() => navigation.navigate('Goals')}
          />
        ) : null}
        {goalsState === 'ready'
          ? activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                formatDate={(date) =>
                  date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                }
                onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
              />
            ))
          : null}
      </PlanSection>

      <PlanSection title="Tasks">
        <AppCard style={styles.taskAccessCard}>
          <View style={styles.taskAccessCopy}>
            <Text style={styles.cardTitle}>Unscheduled work</Text>
            <Text style={styles.cardDescription}>
              Keep standalone tasks visible until they have a place on the calendar or a goal.
            </Text>
          </View>
          <View style={styles.taskAccessActions}>
            <AppButton
              label="Open tasks"
              variant="secondary"
              onPress={() => navigation.navigate('Tasks')}
            />
            <AppButton
              label="New task"
              onPress={() => navigation.navigate('Tasks', { createTask: true })}
            />
          </View>
        </AppCard>
      </PlanSection>

      <PlanSection title="Idea Dump">
        <AppCard style={styles.ideaCard}>
          <AppIcon name="note" size={28} decorative />
          <View style={styles.ideaCopy}>
            {notesState === 'loading' ? (
              <Text style={styles.cardTitle}>Checking your notes...</Text>
            ) : null}
            {notesState === 'error' ? (
              <Text style={styles.cardTitle}>Notes are unavailable</Text>
            ) : null}
            {notesState === 'empty' || notesState === 'ready' ? (
              <Text style={styles.cardTitle}>
                {notes.filter((note) => note.source === 'idea_dump').length} unprocessed ideas
              </Text>
            ) : null}
            <Text style={styles.cardDescription}>Capture a thought before it gets away.</Text>
          </View>
          <AppButton
            label="Open Notes"
            variant="secondary"
            onPress={() =>
              rootNavigation.navigate('Notes', {
                screen: 'Notes',
                params: { createNote: true },
              })
            }
          />
        </AppCard>
        {notesState === 'error' ? (
          <AppButton label="Retry" variant="secondary" onPress={retryNotes} />
        ) : null}
      </PlanSection>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.xl,
      paddingBottom: theme.spacing['3xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    headerCopy: { flex: 1, gap: theme.spacing.xs },
    eyebrow: { ...theme.typography.caption, color: theme.colors.brand },
    title: { ...theme.typography.screenTitle, color: theme.colors.text },
    subtitle: { ...theme.typography.body, color: theme.colors.textSecondary },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.brand,
    },
    avatarText: { ...theme.typography.button, color: theme.colors.onBrand },
    section: { gap: theme.spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, flex: 1 },
    focusCard: { gap: theme.spacing.md },
    focusIcon: { alignSelf: 'flex-start' },
    focusCopy: { gap: theme.spacing.xs },
    ideaCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    ideaCopy: { flex: 1, gap: theme.spacing.xs },
    taskAccessCard: { gap: theme.spacing.md },
    taskAccessCopy: { gap: theme.spacing.xs },
    taskAccessActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    cardTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    cardDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
    stateTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
  });
