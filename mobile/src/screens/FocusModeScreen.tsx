import { useMemo, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { focusModeColors } from '../components/calendar/focusModeColors';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppIcon } from '../components/ui/AppIcon';
import { AppScreen } from '../components/ui/AppScreen';
import { IconButton } from '../components/ui/IconButton';
import { useTheme } from '../design/ThemeProvider';
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
  milestoneId: string | null;
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
    milestoneId: task.milestoneId,
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
    milestoneId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: now,
    updatedAt: now,
  };
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function FocusModeScreen({ route, navigation }: FocusModeScreenProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const createNote = useCreateNote();
  const { tasks } = useTasks();
  const today = useMemo(() => new Date(), []);
  const todayRange = useMemo(() => getTodayRange(today), [today]);
  const { events } = useCalendarEvents(today, undefined, todayRange);
  const [active, setActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [sessionCompletedAt, setSessionCompletedAt] = useState<Date | null>(null);
  const [ideasCaptured, setIdeasCaptured] = useState(0);

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
      <AppScreen
        mode="scroll"
        testID="focus-summary-screen"
        contentContainerStyle={[styles.summaryContent, { paddingTop: insets.top }]}
      >
        <View style={styles.summaryScreen}>
          <View style={styles.summaryBody}>
            <View style={styles.summaryIntro}>
              <View style={styles.summaryIcon}>
                <AppIcon name="complete" size={36} color={focusModeColors.green} decorative />
              </View>
              <Text accessibilityRole="header" style={styles.summaryTitle}>
                Focus Session Complete
              </Text>
              <Text style={styles.summarySubtitle}>Great work, Leader!</Text>
            </View>
            <AppCard style={styles.summaryCard}>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Duration</Text>
                <View style={styles.summaryStatValueGroup}>
                  <Text style={styles.summaryStatValue}>{sessionDuration}</Text>
                  <AppIcon name="timer" size={20} color={theme.colors.textSecondary} decorative />
                </View>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Ideas Captured</Text>
                <View style={styles.summaryStatValueGroup}>
                  <Text style={styles.summaryStatValue}>{ideasCaptured}</Text>
                  <AppIcon name="idea" size={20} color={theme.colors.textSecondary} decorative />
                </View>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Distractions Blocked</Text>
                <View style={styles.summaryStatValueGroup}>
                  <Text style={styles.summaryStatValue}>0</Text>
                  <AppIcon
                    name="security"
                    size={20}
                    color={theme.colors.textSecondary}
                    decorative
                  />
                </View>
              </View>
            </AppCard>
          </View>
          <AppButton label="Done" onPress={navigation.goBack} style={styles.summaryDoneButton} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      mode="scroll"
      testID="focus-start-screen"
      style={styles.startAppScreen}
      contentContainerStyle={[styles.startContent, { paddingTop: insets.top }]}
    >
      {!active ? (
        <View style={styles.startHeader}>
          <IconButton
            name="back"
            accessibilityLabel="Back from Focus Mode"
            onPress={navigation.goBack}
          />
          <Text accessibilityRole="header" style={styles.startEyebrow}>
            Focus Mode
          </Text>
          <View style={styles.startHeaderSpacer} />
        </View>
      ) : null}
      <View style={styles.startScreen}>
        <View style={styles.startVisualGroup}>
          <AppIcon
            testID="focus-start-icon"
            name="focus"
            size={112}
            color={focusModeColors.green}
            decorative
          />
          <Text style={styles.startDescription}>Start a focused{'\n'}work session</Text>
        </View>
        <AppButton label="Start Focus Session" onPress={handleStart} style={styles.startButton} />
      </View>
      <FocusModeOverlay
        visible={active}
        events={focusEvents}
        preferredEventId={focusEvent?.id ?? null}
        sessionStartedAt={sessionStartedAt}
        timerSoundId={profile?.alarmSoundId}
        onUpdateTimerSound={(soundId) => updateProfile({ alarmSoundId: soundId })}
        onClose={handleCloseFocus}
        onSaveIdeaDump={handleSaveIdeaDump}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    startAppScreen: { backgroundColor: focusModeColors.background },
    startContent: { flexGrow: 1, gap: theme.spacing.md },
    summaryContent: { flexGrow: 1 },
    startHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    startHeaderSpacer: { width: 44, height: 44 },
    startEyebrow: {
      ...theme.typography.label,
      color: focusModeColors.green,
      textAlign: 'center',
      flex: 1,
    },
    startScreen: {
      flex: 1,
      justifyContent: 'space-between',
      paddingTop: theme.spacing['2xl'],
      paddingBottom: theme.spacing.sm,
      maxWidth: 360,
      alignSelf: 'center',
      width: '100%',
    },
    startVisualGroup: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing['2xl'],
    },
    startButton: {
      width: '100%',
      minHeight: 48,
      borderRadius: theme.radii.lg,
      backgroundColor: focusModeColors.greenStrong,
    },
    startDescription: {
      ...theme.typography.body,
      color: focusModeColors.textSecondary,
      textAlign: 'center',
    },
    summaryScreen: {
      flex: 1,
      justifyContent: 'space-between',
      gap: theme.spacing.xl,
      maxWidth: 360,
      alignSelf: 'center',
      width: '100%',
      paddingTop: theme.spacing['2xl'],
      paddingBottom: theme.spacing.sm,
    },
    summaryBody: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.xl,
    },
    summaryIntro: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    summaryIcon: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 36,
      borderWidth: 2,
      borderColor: focusModeColors.green,
      backgroundColor: 'transparent',
    },
    summaryTitle: {
      ...theme.typography.cardTitle,
      color: focusModeColors.green,
      textAlign: 'center',
    },
    summarySubtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    summaryCard: {
      gap: theme.spacing.md,
      borderColor: theme.colors.border,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
    },
    summaryStatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    summaryStatValueGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    summaryStatLabel: {
      ...theme.typography.helper,
      color: theme.colors.textSecondary,
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
    summaryDoneButton: { minHeight: 48, width: '100%' },
  });
