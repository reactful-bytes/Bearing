import { useMemo, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { FocusDndStatus, FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppIcon } from '../components/ui/AppIcon';
import { AppScreen } from '../components/ui/AppScreen';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import {
  BearingEvent,
  CalendarDisplayEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
import { useCreateNote } from '../features/notes/useNotes';
import { useTasks } from '../features/tasks/useTasks';
import { useUserProfile } from '../features/profile/useUserProfile';
import type { PlanStackParamList } from '../navigation/navigationTypes';
import { getFirebaseAuth } from '../services/firebase/firebaseAuth';

type FocusModeScreenProps = {
  route: { params?: PlanStackParamList['FocusMode'] };
  navigation: { goBack: () => void };
};

function getTodayRange(date: Date): { start: Date; end: Date } {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  };
}

function toTaskFocusEvent(task: {
  id: string;
  userId: string;
  title: string;
  description: string;
  goalId: string | null;
  stepId: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  allDay: boolean;
}): BearingEvent | null {
  if (!task.scheduledStart || !task.scheduledEnd) {
    return null;
  }

  return {
    ownership: 'bearing',
    id: `task-focus-${task.id}`,
    userId: task.userId,
    title: task.title,
    description: task.description,
    startAt: task.scheduledStart,
    endAt: task.scheduledEnd,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allDay: task.allDay,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: task.id,
    goalId: task.goalId,
    stepId: task.stepId,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: task.scheduledStart,
    updatedAt: task.scheduledStart,
  };
}

function toLaunchFocusEvent(params: PlanStackParamList['FocusMode']): BearingEvent | null {
  if (!params?.title || !params.startAtIso || !params.endAtIso) {
    return null;
  }

  const startAt = new Date(params.startAtIso);
  const endAt = new Date(params.endAtIso);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return null;
  }

  const now = new Date();
  return {
    ownership: 'bearing',
    id: params.eventId ?? `focus-${startAt.getTime()}`,
    userId: getFirebaseAuth().currentUser?.uid ?? 'unknown-user',
    title: params.title,
    description: params.description ?? '',
    startAt,
    endAt,
    timezone: params.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    sourceTaskId: params.taskId ?? null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: now,
    updatedAt: now,
  };
}

function formatEndTime(event: CalendarDisplayEvent | null, locale?: string): string | null {
  if (!event) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(event.endAt);
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function FocusModeScreen({ route, navigation }: FocusModeScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { profile } = useUserProfile();
  const createNote = useCreateNote();
  const { tasks } = useTasks();
  const today = useMemo(() => new Date(), []);
  const todayRange = useMemo(() => getTodayRange(today), [today]);
  const { events, uiState } = useCalendarEvents(today, undefined, todayRange);
  const [active, setActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [sessionCompletedAt, setSessionCompletedAt] = useState<Date | null>(null);
  const [ideasCaptured, setIdeasCaptured] = useState(0);
  const [dndStatus, setDndStatus] = useState<FocusDndStatus>('unavailable');

  const taskFocusEvent = useMemo(() => {
    const taskId = route.params?.taskId;
    if (!taskId) return null;
    const task = tasks.find((item) => item.id === taskId);
    return task ? toTaskFocusEvent(task) : null;
  }, [route.params?.taskId, tasks]);
  const launchFocusEvent = useMemo(() => toLaunchFocusEvent(route.params), [route.params]);

  const focusEvent = useMemo(() => {
    const requestedEvent = route.params?.eventId
      ? (events.find((event) => event.id === route.params?.eventId) ?? null)
      : null;
    if (requestedEvent) return requestedEvent;
    if (taskFocusEvent) return taskFocusEvent;
    if (launchFocusEvent) return launchFocusEvent;

    const now = new Date();
    return (
      events.find((event) => now >= event.startAt && now < event.endAt) ??
      events.find((event) => event.startAt > now) ??
      null
    );
  }, [events, launchFocusEvent, route.params?.eventId, taskFocusEvent]);

  const focusEvents = useMemo<CalendarDisplayEvent[]>(() => {
    const contextualEvent = taskFocusEvent ?? launchFocusEvent;
    if (!contextualEvent || events.some((event) => event.id === contextualEvent.id)) {
      return events;
    }
    return [contextualEvent, ...events];
  }, [events, launchFocusEvent, taskFocusEvent]);

  usePreventRemove(active, () => undefined);

  function handleStart(): void {
    setSessionStartedAt(new Date());
    setSessionCompletedAt(null);
    setIdeasCaptured(0);
    setActive(true);
  }

  function handleCloseFocus(): void {
    setActive(false);
    setSessionCompletedAt(new Date());
  }

  async function handleSaveIdeaDump(input: Parameters<typeof createNote>[0]): Promise<void> {
    await createNote(input);
    setIdeasCaptured((count) => count + 1);
  }

  const sessionDuration =
    sessionStartedAt && sessionCompletedAt
      ? formatDuration(sessionCompletedAt.getTime() - sessionStartedAt.getTime())
      : '0m';

  if (sessionCompletedAt && !active) {
    return (
      <AppScreen mode="scroll" testID="focus-summary-screen">
        <View style={styles.summaryScreen}>
          <View style={styles.summaryIcon}>
            <AppIcon name="complete" size={32} decorative />
          </View>
          <Text style={styles.eyebrow}>Focus Mode</Text>
          <Text accessibilityRole="header" style={styles.summaryTitle}>
            Focus Session Complete
          </Text>
          <Text style={styles.summarySubtitle}>
            {focusEvent?.title ?? 'Focused work'} is complete.
          </Text>
          <AppCard style={styles.summaryCard}>
            <View style={styles.summaryStatRow}>
              <AppIcon name="timer" size={20} decorative />
              <Text style={styles.summaryStatValue}>Duration: {sessionDuration}</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatRow}>
              <AppIcon name="idea" size={20} decorative />
              <Text style={styles.summaryStatValue}>Ideas captured: {ideasCaptured}</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatRow}>
              <AppIcon name="security" size={20} decorative />
              <Text style={styles.summaryStatValue}>
                {dndStatus === 'blocked'
                  ? 'Distractions blocked: Android priority mode'
                  : 'Distractions blocked: unavailable'}
              </Text>
            </View>
          </AppCard>
          <AppButton label="Done" onPress={navigation.goBack} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen mode="scroll" testID="focus-start-screen">
      <View style={styles.startScreen}>
        <View style={styles.startIcon}>
          <AppIcon name="focus" size={44} decorative />
        </View>
        <Text style={styles.eyebrow}>Focus Mode</Text>
        <Text accessibilityRole="header" style={styles.startTitle}>
          Focus on what matters next.
        </Text>
        <AppCard style={styles.contextCard}>
          <Text style={styles.contextLabel}>Focus on</Text>
          <Text style={styles.contextTitle}>{focusEvent?.title ?? 'Open focus session'}</Text>
          <Text style={styles.contextDescription}>
            {focusEvent
              ? `Ends at ${formatEndTime(focusEvent, profile?.locale)}`
              : uiState === 'loading'
                ? "Checking today's schedule..."
                : 'No scheduled block selected. Focus Mode remains available for unscheduled work.'}
          </Text>
        </AppCard>
        <Text style={styles.startDescription}>
          Focus Mode keeps the timer and Idea Dump visible while reducing distractions.
        </Text>
        <AppButton label="Start Focus Session" onPress={handleStart} />
      </View>
      <FocusModeOverlay
        visible={active}
        events={focusEvents}
        preferredEventId={focusEvent?.id ?? null}
        timerSoundId={profile?.alarmSoundId}
        onClose={handleCloseFocus}
        onSaveIdeaDump={handleSaveIdeaDump}
        onDndStatusChange={setDndStatus}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    startScreen: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.lg,
      maxWidth: 360,
      alignSelf: 'center',
      width: '100%',
    },
    startIcon: {
      alignSelf: 'center',
      width: 112,
      height: 112,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 56,
      borderWidth: 2,
      borderColor: theme.colors.focusGreen,
      backgroundColor: theme.colors.surfaceRaised,
    },
    eyebrow: {
      ...theme.typography.label,
      color: theme.colors.focusGreen,
      textAlign: 'center',
    },
    startTitle: {
      ...theme.typography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.text,
      textAlign: 'center',
    },
    contextCard: {
      gap: theme.spacing.sm,
      borderColor: theme.colors.focusGreen,
      borderWidth: 1,
    },
    contextLabel: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
    },
    contextTitle: {
      ...theme.typography.cardTitle,
      color: theme.colors.text,
    },
    contextDescription: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
    },
    startDescription: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    summaryScreen: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.lg,
      maxWidth: 360,
      alignSelf: 'center',
      width: '100%',
    },
    summaryIcon: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 36,
      borderWidth: 2,
      borderColor: theme.colors.focusGreen,
      backgroundColor: theme.colors.surfaceRaised,
    },
    summaryTitle: {
      ...theme.typography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.text,
      textAlign: 'center',
    },
    summarySubtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    summaryCard: {
      gap: theme.spacing.md,
    },
    summaryStatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    summaryStatValue: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    summaryStatDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });
