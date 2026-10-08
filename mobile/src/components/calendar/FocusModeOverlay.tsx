import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FormField } from '../ui/FormField';
import { IconButton } from '../ui/IconButton';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { focusModeColors } from './focusModeColors';
import { FocusModeUtilitySheet } from './FocusModeUtilitySheet';
import type { FocusModeDndStatus, FocusModeUtilitySection } from './FocusModeUtilitySheet';
import { CalendarDisplayEvent } from '../../features/calendar/calendarTypes';
import { clearFocusSession, setFocusSession } from '../../features/focus/focusSession';
import { CreateNoteInput } from '../../features/notes/noteTypes';
import {
  DEFAULT_TIMER_SOUND_ID,
  ensureProfileSoundPreviewUri,
} from '../../features/profile/profileSounds';
import {
  androidFocusDndService,
  FocusDndService,
} from '../../services/focus/androidFocusDndService';

type FocusModeOverlayProps = {
  visible: boolean;
  events: CalendarDisplayEvent[];
  preferredEventId?: string | null;
  sessionStartedAt?: Date | null;
  timerSoundId?: string;
  onUpdateTimerSound?: (soundId: string) => Promise<void>;
  onClose: () => void;
  onSaveIdeaDump: (input: CreateNoteInput) => Promise<void>;
  dndService?: FocusDndService;
  onDndStatusChange?: (status: FocusDndStatus) => void;
};

export type FocusDndStatus = FocusModeDndStatus;

const HOLD_TO_EXIT_MS = 3000;

function findActiveEvent(
  events: CalendarDisplayEvent[],
  preferredEventId: string | null,
  now: Date,
): CalendarDisplayEvent | null {
  const preferredEvent = preferredEventId
    ? (events.find(
        (event) => event.id === preferredEventId && now >= event.startAt && now < event.endAt,
      ) ?? null)
    : null;

  return (
    preferredEvent ?? events.find((event) => now >= event.startAt && now < event.endAt) ?? null
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function FocusModeOverlay({
  visible,
  events,
  preferredEventId = null,
  sessionStartedAt = null,
  timerSoundId = DEFAULT_TIMER_SOUND_ID,
  onUpdateTimerSound,
  onClose,
  onSaveIdeaDump,
  dndService = androidFocusDndService,
  onDndStatusChange,
}: FocusModeOverlayProps) {
  const styles = useThemedStyles(createStyles);
  const [now, setNow] = useState<Date>(new Date());
  const [ideaBody, setIdeaBody] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const [utilitySection, setUtilitySection] = useState<FocusModeUtilitySection | null>(null);
  const [fallbackSessionStartedAt, setFallbackSessionStartedAt] = useState<Date | null>(null);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndError, setDndError] = useState<string | null>(null);
  const [showDndSettingsAction, setShowDndSettingsAction] = useState(false);
  const [endAlertEnabled, setEndAlertEnabled] = useState(true);
  const [dndStatus, setDndStatus] = useState<FocusDndStatus>(
    dndService.isAvailable ? 'checking' : 'unavailable',
  );
  const [holdProgress, setHoldProgress] = useState(0);
  const [exitButtonWidth, setExitButtonWidth] = useState(0);
  const holdProgressValue = useSharedValue(0);
  const timerPlayer = useAudioPlayer(null);
  const timerPlayerRef = useRef(timerPlayer);
  const timerPlayerDisposedRef = useRef(false);
  const dndRequestedRef = useRef(true);
  const dndPermissionRequestedRef = useRef(false);

  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedAtRef = useRef<number | null>(null);
  const exitCompletedRef = useRef(false);
  const exitHoldReachedRef = useRef(false);
  const savedConfirmationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedEventRef = useRef<CalendarDisplayEvent | null>(null);
  const timerCompletionHandledRef = useRef(false);
  const exitProgressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${holdProgressValue.value * 100}%`,
  }));
  const exitFilledLabelAnimatedStyle = useAnimatedStyle(() => ({
    width: exitButtonWidth * holdProgressValue.value,
  }));

  const stopTimerSound = useCallback((): void => {
    if (timerPlayerDisposedRef.current) {
      return;
    }

    try {
      const player = timerPlayerRef.current;
      player.loop = false;
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    } catch {}
  }, []);

  useEffect(() => {
    onDndStatusChange?.(dndStatus);
  }, [dndStatus, onDndStatusChange]);

  const syncDndMode = useCallback(
    async (isCurrent: () => boolean = () => true): Promise<void> => {
      if (!dndService.isAvailable) {
        if (isCurrent()) {
          setDndEnabled(false);
          setDndStatus('unavailable');
        }
        return;
      }

      setDndError(null);
      try {
        const hasAccess = await dndService.hasPolicyAccess();
        if (!isCurrent()) return;

        if (!hasAccess) {
          setDndEnabled(false);
          setDndStatus(dndRequestedRef.current ? 'not-granted' : 'off');
          setShowDndSettingsAction(dndPermissionRequestedRef.current);
          return;
        }

        setShowDndSettingsAction(false);
        if (!dndRequestedRef.current) {
          setDndEnabled(false);
          setDndStatus('off');
          return;
        }

        const started = await dndService.beginPriorityMode();
        if (!isCurrent()) return;
        setDndEnabled(started);
        setDndStatus(started ? 'blocked' : 'unavailable');
        setShowDndSettingsAction(false);
        if (!started) {
          setDndError('Could not start Do Not Disturb. Please try again.');
        }
      } catch {
        if (!isCurrent()) return;
        setDndEnabled(false);
        setDndStatus('unavailable');
        setDndError('Could not update Do Not Disturb. Please try again.');
        setShowDndSettingsAction(dndPermissionRequestedRef.current);
      }
    },
    [dndService],
  );

  useEffect(() => {
    if (!visible) {
      dndRequestedRef.current = true;
      dndPermissionRequestedRef.current = false;
      return;
    }

    if (!dndService.isAvailable) {
      setDndEnabled(false);
      setDndStatus('unavailable');
      return;
    }

    let disposed = false;
    void syncDndMode(() => !disposed);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        clearHoldTracking();
        holdStartedAtRef.current = null;
        exitHoldReachedRef.current = false;
        exitCompletedRef.current = false;
        setHoldProgress(0);
        cancelAnimation(holdProgressValue);
        holdProgressValue.value = 0;
      }
      if (nextState === 'active') {
        void syncDndMode(() => !disposed);
      }
    });

    return () => {
      disposed = true;
      appStateSubscription.remove();
      void dndService.endPriorityMode().catch(() => {
        onDndStatusChange?.('unavailable');
      });
    };
  }, [dndService, holdProgressValue, onDndStatusChange, syncDndMode, visible]);

  useEffect(() => {
    if (!visible) {
      setUtilitySection(null);
      setFallbackSessionStartedAt(null);
      setEndAlertEnabled(true);
      setShowDndSettingsAction(false);
      setDndError(null);
      return;
    }

    if (sessionStartedAt) {
      setFallbackSessionStartedAt(null);
      return;
    }

    setFallbackSessionStartedAt((current) => current ?? new Date());
  }, [sessionStartedAt, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setNow(new Date());
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      stopTimerSound();
      setIdeaBody('');
      setSaveError(null);
      setSavedCount(0);
      setShowSavedConfirmation(false);
      if (savedConfirmationTimeoutRef.current) {
        clearTimeout(savedConfirmationTimeoutRef.current);
        savedConfirmationTimeoutRef.current = null;
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      if (holdExitTimeoutRef.current) {
        clearTimeout(holdExitTimeoutRef.current);
        holdExitTimeoutRef.current = null;
      }
      holdStartedAtRef.current = null;
      exitCompletedRef.current = false;
      exitHoldReachedRef.current = false;
      setHoldProgress(0);
      cancelAnimation(holdProgressValue);
      holdProgressValue.value = 0;
      trackedEventRef.current = null;
      timerCompletionHandledRef.current = false;
    }
  }, [holdProgressValue, stopTimerSound, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const activeEvent = findActiveEvent(events, preferredEventId, now);
    if (activeEvent) {
      trackedEventRef.current = activeEvent;
    }

    const trackedEvent = trackedEventRef.current;
    if (
      !trackedEvent ||
      timerCompletionHandledRef.current ||
      now.getTime() < trackedEvent.endAt.getTime()
    ) {
      return;
    }

    timerCompletionHandledRef.current = true;
    onClose();

    if (!endAlertEnabled) {
      return;
    }

    let disposed = false;

    void (async () => {
      try {
        const [soundUri] = await Promise.all([
          ensureProfileSoundPreviewUri(timerSoundId),
          setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'doNotMix',
          }),
        ]);

        if (disposed || timerPlayerDisposedRef.current) {
          return;
        }

        try {
          const player = timerPlayerRef.current;
          player.loop = true;
          player.replace(soundUri);
          player.play();
        } catch {
          return;
        }
      } catch {
        return;
      }

      if (disposed || timerPlayerDisposedRef.current) {
        return;
      }

      Alert.alert(`${trackedEvent.title} block finished`, undefined, [
        { text: 'OK', onPress: stopTimerSound },
      ]);
    })();

    return () => {
      disposed = true;
    };
  }, [
    endAlertEnabled,
    events,
    now,
    onClose,
    preferredEventId,
    stopTimerSound,
    timerSoundId,
    visible,
  ]);

  useEffect(() => {
    if (!visible || dndService.isAvailable) {
      return;
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        clearHoldTracking();
        holdStartedAtRef.current = null;
        exitHoldReachedRef.current = false;
        exitCompletedRef.current = false;
        setHoldProgress(0);
        cancelAnimation(holdProgressValue);
        holdProgressValue.value = 0;
      }
    });

    return () => appStateSubscription.remove();
  }, [dndService.isAvailable, holdProgressValue, visible]);

  useEffect(() => {
    timerPlayerDisposedRef.current = false;

    return () => {
      timerPlayerDisposedRef.current = true;
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      if (holdExitTimeoutRef.current) {
        clearTimeout(holdExitTimeoutRef.current);
        holdExitTimeoutRef.current = null;
      }
      holdStartedAtRef.current = null;
      exitHoldReachedRef.current = false;
      exitCompletedRef.current = false;
      if (savedConfirmationTimeoutRef.current) {
        clearTimeout(savedConfirmationTimeoutRef.current);
      }
    };
  }, []);

  const focusSummary = useMemo(() => {
    const activeEvent = findActiveEvent(events, preferredEventId, now);
    const nextEvent = activeEvent ? null : (events.find((event) => event.startAt > now) ?? null);

    if (activeEvent) {
      return {
        title: activeEvent.title,
        timerLabel: 'Time remaining',
        timerValue: formatDuration(activeEvent.endAt.getTime() - now.getTime()),
        event: activeEvent,
        contextEvent: activeEvent,
      };
    }

    if (nextEvent) {
      return {
        title: nextEvent.title,
        timerLabel: 'Starts in',
        timerValue: formatDuration(nextEvent.startAt.getTime() - now.getTime()),
        event: null,
        contextEvent: nextEvent,
      };
    }

    return {
      title: 'Deep Work',
      timerLabel: 'Time remaining',
      timerValue: '--:--:--',
      event: null,
      contextEvent: null,
    };
  }, [events, now, preferredEventId]);

  useEffect(() => {
    if (!visible || !focusSummary.event) {
      clearFocusSession();
      return;
    }

    setFocusSession({
      eventId: focusSummary.event.id,
      title: focusSummary.event.title,
      endAt: focusSummary.event.endAt,
    });

    return () => clearFocusSession();
  }, [focusSummary.event, visible]);

  function clearHoldTracking(): void {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (holdExitTimeoutRef.current) {
      clearTimeout(holdExitTimeoutRef.current);
      holdExitTimeoutRef.current = null;
    }
  }

  function completeExitHold(): void {
    if (exitHoldReachedRef.current) {
      return;
    }

    exitHoldReachedRef.current = true;
    clearHoldTracking();
    setHoldProgress(1);
    cancelAnimation(holdProgressValue);
    holdProgressValue.value = 1;
  }

  function handlePressInExit(): void {
    if (holdStartedAtRef.current !== null) {
      return;
    }

    exitCompletedRef.current = false;
    exitHoldReachedRef.current = false;
    const startTime = Date.now();
    holdStartedAtRef.current = startTime;
    setHoldProgress(0);
    cancelAnimation(holdProgressValue);
    holdProgressValue.value = withTiming(1, {
      duration: HOLD_TO_EXIT_MS,
      easing: Easing.linear,
    });

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / HOLD_TO_EXIT_MS);
      setHoldProgress(progress);
      if (progress >= 1) {
        completeExitHold();
      }
    }, 100);
    holdExitTimeoutRef.current = setTimeout(completeExitHold, HOLD_TO_EXIT_MS);
  }

  function handlePressOutExit(): void {
    if (exitCompletedRef.current) {
      holdStartedAtRef.current = null;
      return;
    }

    const heldDuration =
      holdStartedAtRef.current === null ? 0 : Date.now() - holdStartedAtRef.current;
    clearHoldTracking();
    holdStartedAtRef.current = null;
    if (exitHoldReachedRef.current || heldDuration >= HOLD_TO_EXIT_MS) {
      completeExitHold();
      exitCompletedRef.current = true;
      onClose();
      return;
    }

    setHoldProgress(0);
    cancelAnimation(holdProgressValue);
    holdProgressValue.value = withTiming(0, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  }

  async function handleSaveIdeaDump(): Promise<void> {
    if (saving) {
      return;
    }

    const trimmedBody = ideaBody.trim();

    if (!trimmedBody) {
      setSaveError('Write a thought before saving Idea Dump.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSaveIdeaDump({
        body: trimmedBody,
        source: 'idea_dump',
        sourceEventId: focusSummary.event?.id ?? null,
        sourceMilestoneId:
          focusSummary.event?.ownership === 'bearing' ? focusSummary.event.milestoneId : null,
      });
      setIdeaBody('');
      setSavedCount((count) => count + 1);
      setShowSavedConfirmation(true);
      if (savedConfirmationTimeoutRef.current) {
        clearTimeout(savedConfirmationTimeoutRef.current);
      }
      savedConfirmationTimeoutRef.current = setTimeout(() => {
        setShowSavedConfirmation(false);
        savedConfirmationTimeoutRef.current = null;
      }, 1800);
    } catch {
      setSaveError('Failed to save Idea Dump. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const distractionStatusText =
    dndStatus === 'blocked'
      ? 'Distractions blocked'
      : dndStatus === 'not-granted'
        ? 'Protection not granted'
        : dndStatus === 'checking'
          ? 'Checking protection...'
          : dndStatus === 'off'
            ? 'Protection off for this session'
            : 'Protection unavailable on this device';
  const exitButtonLabel = 'Hold for 3 seconds to exit';

  async function handleDndEnabledChange(enabled: boolean): Promise<void> {
    dndRequestedRef.current = enabled;
    dndPermissionRequestedRef.current = enabled;
    setDndError(null);

    if (!enabled) {
      setDndEnabled(false);
      setDndStatus('off');
      setShowDndSettingsAction(false);
      try {
        await dndService.endPriorityMode();
      } catch {
        setDndError('Could not turn off Do Not Disturb. Please try again.');
      }
      return;
    }

    setDndStatus('checking');
    await syncDndMode();
  }

  async function handleOpenDndSettings(): Promise<void> {
    try {
      await dndService.openPolicyAccessSettings();
    } catch {
      setDndError('Could not open Android Do Not Disturb settings.');
    }
  }

  // Match AppModal: unmount the native Modal entirely while closed instead of
  // leaving a hidden window, which Android can render as a stray dark bar.
  if (!visible) {
    return null;
  }

  const activeSessionModal = (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <SafeAreaView style={styles.screen}>
          <ScrollView
            testID="focus-session-scroll"
            style={styles.contentScroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroBlock}>
              <Text style={styles.eyebrow}>FOCUS MODE</Text>
              <Text style={styles.eventTitle}>{focusSummary.title}</Text>
            </View>

            <View style={styles.sessionContent}>
              <View testID="focus-timer" style={styles.timerCard}>
                <Text style={styles.timerValue}>{focusSummary.timerValue}</Text>
                <Text style={styles.timerLabel}>{focusSummary.timerLabel}</Text>
              </View>

              <View style={styles.ideaBlock}>
                <FormField
                  label="Quick Idea Dump"
                  helperText="Capture thoughts without breaking your focus."
                  error={saveError}
                  accessibilityLabel="Idea dump input"
                  placeholder="Type your idea here..."
                  placeholderTextColor={styles.ideaInput.color}
                  value={ideaBody}
                  onChangeText={setIdeaBody}
                  containerStyle={styles.ideaField}
                  inputContainerStyle={styles.ideaInputContainer}
                  labelStyle={styles.ideaTitle}
                  inputStyle={styles.ideaInput}
                  helperStyle={styles.ideaDescription}
                  errorStyle={styles.errorText}
                  trailingIcon="create"
                  trailingIconLabel="Add idea"
                  onPressTrailingIcon={saving ? undefined : () => void handleSaveIdeaDump()}
                />
                <View style={styles.ideaMeta}>
                  <Text style={styles.ideaCount}>Ideas captured: {savedCount}</Text>
                  {showSavedConfirmation ? <Text style={styles.savedText}>Saved</Text> : null}
                </View>
              </View>

              <View style={styles.utilityBlock}>
                {focusSummary.event ? (
                  <View style={styles.endTimeRow}>
                    <Text style={styles.endTimeLabel}>End Time</Text>
                    <Text style={styles.endTime}>
                      {focusSummary.event.endAt.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.utilityDivider} />
                <View style={styles.distractionBlock}>
                  <Text style={styles.distractionHeading}>Distraction protection</Text>
                  <Text style={styles.distractionStatus}>{distractionStatusText}</Text>
                </View>
                <View style={styles.utilityButtons}>
                  <IconButton
                    name="duration"
                    accessibilityLabel="Session Details"
                    onPress={() => setUtilitySection('details')}
                    color={focusModeColors.text}
                    style={styles.utilityAction}
                  />
                  <IconButton
                    name="support"
                    accessibilityLabel="Focus Environment"
                    onPress={() => setUtilitySection('environment')}
                    color={focusModeColors.text}
                    style={styles.utilityAction}
                  />
                  <IconButton
                    name="settings"
                    accessibilityLabel="Focus Settings"
                    onPress={() => setUtilitySection('settings')}
                    color={focusModeColors.text}
                    style={styles.utilityAction}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.exitBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hold to return to calendar"
              accessibilityHint="Press and hold for 3 seconds to exit Focus Mode."
              accessibilityValue={{ min: 0, max: 100, now: Math.round(holdProgress * 100) }}
              onPressIn={handlePressInExit}
              onPressOut={handlePressOutExit}
              onLayout={(event) => setExitButtonWidth(event.nativeEvent.layout.width)}
              style={({ pressed }) => [
                styles.exitButton,
                pressed ? styles.exitButtonPressed : null,
              ]}
            >
              <View pointerEvents="none" style={styles.exitProgressTrack}>
                <Animated.View
                  testID="focus-exit-progress-fill"
                  style={[styles.exitProgressFill, exitProgressAnimatedStyle]}
                />
              </View>
              <View pointerEvents="none" style={styles.exitButtonLabel}>
                <Text style={styles.exitButtonText}>{exitButtonLabel}</Text>
                <Animated.View
                  testID="focus-exit-filled-label"
                  style={[styles.exitFilledLabelClip, exitFilledLabelAnimatedStyle]}
                >
                  <View style={[styles.exitFilledLabelWidth, { width: exitButtonWidth }]}>
                    <Text style={[styles.exitButtonText, styles.exitFilledButtonText]}>
                      {exitButtonLabel}
                    </Text>
                  </View>
                </Animated.View>
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <>
      {activeSessionModal}
      {utilitySection ? (
        <FocusModeUtilitySheet
          section={utilitySection}
          onDismiss={() => setUtilitySection(null)}
          sessionTitle={focusSummary.title}
          linkedEvent={focusSummary.contextEvent}
          sessionStartedAt={sessionStartedAt ?? fallbackSessionStartedAt ?? now}
          now={now}
          timerLabel={focusSummary.timerLabel}
          timerValue={focusSummary.timerValue}
          ideasCaptured={savedCount}
          dndAvailable={dndService.isAvailable}
          dndEnabled={dndEnabled}
          dndStatus={dndStatus}
          dndError={dndError}
          showDndSettingsAction={showDndSettingsAction}
          onDndEnabledChange={(enabled) => void handleDndEnabledChange(enabled)}
          onOpenDndSettings={() => void handleOpenDndSettings()}
          timerSoundId={timerSoundId}
          onUpdateTimerSound={onUpdateTimerSound}
          endAlertEnabled={endAlertEnabled}
          onEndAlertEnabledChange={setEndAlertEnabled}
        />
      ) : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
      backgroundColor: focusModeColors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: focusModeColors.background,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    contentScroll: { flex: 1 },
    content: {
      flexGrow: 1,
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    sessionContent: {
      flexGrow: 1,
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    heroBlock: {
      gap: theme.spacing.sm,
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
    },
    eyebrow: {
      ...theme.typography.label,
      color: focusModeColors.green,
    },
    eventTitle: {
      ...theme.typography.cardTitle,
      color: focusModeColors.text,
      textAlign: 'center',
    },
    timerCard: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    timerLabel: {
      ...theme.typography.body,
      color: focusModeColors.textSecondary,
      textAlign: 'center',
    },
    timerValue: {
      fontSize: 52,
      lineHeight: 62,
      fontWeight: '300',
      fontVariant: ['tabular-nums'],
      color: focusModeColors.text,
    },
    endTime: {
      ...theme.typography.body,
      color: focusModeColors.text,
      textAlign: 'center',
    },
    ideaBlock: {
      gap: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: focusModeColors.border,
      backgroundColor: focusModeColors.surface,
      padding: theme.spacing.md,
    },
    ideaField: {},
    ideaInputContainer: {
      backgroundColor: focusModeColors.surfaceRaised,
      borderColor: focusModeColors.border,
    },
    ideaTitle: {
      ...theme.typography.cardTitle,
      color: focusModeColors.text,
      textTransform: 'none',
    },
    ideaDescription: {
      ...theme.typography.helper,
      color: focusModeColors.textSecondary,
    },
    ideaInput: {
      minHeight: 44,
      borderRadius: theme.radii.md,
      backgroundColor: focusModeColors.surfaceRaised,
      borderWidth: 0,
      color: focusModeColors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.helper,
      color: theme.colors.dangerText,
    },
    ideaMeta: {
      minHeight: 22,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ideaCount: {
      ...theme.typography.helper,
      color: focusModeColors.textSecondary,
    },
    savedText: {
      ...theme.typography.helper,
      color: focusModeColors.green,
    },
    utilityBlock: {
      gap: theme.spacing.sm,
    },
    endTimeRow: {
      minHeight: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    endTimeLabel: {
      ...theme.typography.body,
      color: focusModeColors.textSecondary,
    },
    utilityDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: focusModeColors.border,
    },
    distractionBlock: { alignItems: 'center', gap: theme.spacing.xs },
    distractionHeading: {
      ...theme.typography.helper,
      color: focusModeColors.green,
    },
    distractionStatus: {
      ...theme.typography.caption,
      color: focusModeColors.textSecondary,
      textAlign: 'center',
    },
    utilityButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
      justifyContent: 'center',
      paddingTop: theme.spacing.xs,
    },
    utilityAction: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focusModeColors.utilityButtonBackground,
      borderWidth: 1,
      borderColor: focusModeColors.border,
    },
    exitBlock: {
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
    },
    exitButton: {
      height: 56,
      width: '100%',
      justifyContent: 'center',
      borderRadius: 28,
      borderWidth: 1,
      borderColor: focusModeColors.border,
      backgroundColor: focusModeColors.surfaceRaised,
      overflow: 'hidden',
    },
    exitButtonPressed: {
      opacity: 0.92,
    },
    exitProgressTrack: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderRadius: 28,
      overflow: 'hidden',
    },
    exitProgressFill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: focusModeColors.greenLight,
    },
    exitButtonLabel: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitFilledLabelClip: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    exitFilledLabelWidth: {
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    exitButtonText: {
      ...theme.typography.button,
      textAlign: 'center',
      color: focusModeColors.text,
      width: '100%',
    },
    exitFilledButtonText: {
      color: focusModeColors.greenDarkText,
    },
  });
