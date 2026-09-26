import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../ui/AppButton';
import { AppIcon } from '../ui/AppIcon';
import { FormField } from '../ui/FormField';
import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
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
  timerSoundId?: string;
  onClose: () => void;
  onSaveIdeaDump: (input: CreateNoteInput) => Promise<void>;
  dndService?: FocusDndService;
  onDndStatusChange?: (status: FocusDndStatus) => void;
};

export type FocusDndStatus = 'checking' | 'blocked' | 'not-granted' | 'unavailable';

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
  timerSoundId = DEFAULT_TIMER_SOUND_ID,
  onClose,
  onSaveIdeaDump,
  dndService = androidFocusDndService,
  onDndStatusChange,
}: FocusModeOverlayProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [now, setNow] = useState<Date>(new Date());
  const [ideaBody, setIdeaBody] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const [dndStatus, setDndStatus] = useState<FocusDndStatus>(
    dndService.isAvailable ? 'checking' : 'unavailable',
  );
  const [holdProgress, setHoldProgress] = useState(0);
  const timerPlayer = useAudioPlayer(null);
  const timerPlayerRef = useRef(timerPlayer);
  const timerPlayerDisposedRef = useRef(false);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedConfirmationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedEventRef = useRef<CalendarDisplayEvent | null>(null);
  const timerCompletionHandledRef = useRef(false);

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

  useEffect(() => {
    if (!visible || !dndService.isAvailable) {
      setDndStatus('unavailable');
      return;
    }

    let disposed = false;

    async function activatePriorityMode(showAccessPrompt: boolean): Promise<void> {
      try {
        const hasAccess = await dndService.hasPolicyAccess();
        if (disposed) return;

        if (hasAccess) {
          const started = await dndService.beginPriorityMode();
          if (!disposed) {
            setDndStatus(started ? 'blocked' : 'not-granted');
          }
          return;
        }

        setDndStatus('not-granted');

        if (showAccessPrompt) {
          Alert.alert(
            'Allow Do Not Disturb access?',
            'Bearing can use Android priority-only Do Not Disturb during Focus Mode. Focus Mode will still work if you decline.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  void dndService.openPolicyAccessSettings().catch(() => {
                    Alert.alert(
                      'Unable to open Settings',
                      'Open Android Settings and allow Bearing under Do Not Disturb access.',
                    );
                  });
                },
              },
            ],
          );
        }
      } catch {
        if (!disposed) {
          setDndStatus('unavailable');
          Alert.alert(
            'Do Not Disturb unavailable',
            'Focus Mode is still active, but Android priority-only Do Not Disturb could not be enabled.',
          );
        }
      }
    }

    void activatePriorityMode(true);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        clearHoldTracking();
        setHoldProgress(0);
      }
      if (nextState === 'active') {
        void activatePriorityMode(false);
      }
    });

    return () => {
      disposed = true;
      appStateSubscription.remove();
      void dndService.endPriorityMode().catch(() => {
        Alert.alert(
          'Check Do Not Disturb',
          'Bearing could not restore Android Do Not Disturb. Check the current setting before continuing.',
        );
      });
    };
  }, [dndService, visible]);

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
      setHoldProgress(0);
      trackedEventRef.current = null;
      timerCompletionHandledRef.current = false;
    }
  }, [stopTimerSound, visible]);

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
  }, [events, now, onClose, preferredEventId, stopTimerSound, timerSoundId, visible]);

  useEffect(() => {
    if (!visible || dndService.isAvailable) {
      return;
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        clearHoldTracking();
        setHoldProgress(0);
      }
    });

    return () => appStateSubscription.remove();
  }, [dndService.isAvailable, visible]);

  useEffect(() => {
    timerPlayerDisposedRef.current = false;

    return () => {
      timerPlayerDisposedRef.current = true;
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
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
        subtitle: 'Current event',
        timerLabel: 'Time remaining',
        timerValue: formatDuration(activeEvent.endAt.getTime() - now.getTime()),
        event: activeEvent,
      };
    }

    if (nextEvent) {
      return {
        title: nextEvent.title,
        subtitle: 'Next event',
        timerLabel: 'Starts in',
        timerValue: formatDuration(nextEvent.startAt.getTime() - now.getTime()),
        event: null,
      };
    }

    return {
      title: 'No active event right now',
      subtitle: 'Focus Mode still lets you capture thoughts without leaving the flow.',
      timerLabel: 'Timer',
      timerValue: '--:--:--',
      event: null,
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
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }

  function handlePressInExit(): void {
    if (holdTimeoutRef.current || holdIntervalRef.current) {
      return;
    }

    const startTime = Date.now();
    setHoldProgress(0);

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setHoldProgress(Math.min(1, elapsed / HOLD_TO_EXIT_MS));
    }, 100);

    holdTimeoutRef.current = setTimeout(() => {
      clearHoldTracking();
      setHoldProgress(1);
      onClose();
    }, HOLD_TO_EXIT_MS);
  }

  function handlePressOutExit(): void {
    clearHoldTracking();
    setHoldProgress(0);
  }

  async function handleSaveIdeaDump(): Promise<void> {
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

  const holdSecondsRemaining = Math.max(0, Math.ceil((1 - holdProgress) * 3));

  // Match AppModal: unmount the native Modal entirely while closed instead of
  // leaving a hidden window, which Android can render as a stray dark bar.
  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <SafeAreaView style={styles.screen}>
          <View style={styles.heroBlock}>
            <Text style={styles.eyebrow}>Focus Mode</Text>
            <Text style={styles.eventTitle}>{focusSummary.title}</Text>
            <Text style={styles.eventSubtitle}>{focusSummary.subtitle}</Text>
          </View>

          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>{focusSummary.timerLabel}</Text>
            <Text style={styles.timerValue}>{focusSummary.timerValue}</Text>
            {focusSummary.event ? (
              <Text style={styles.endTime}>
                Ends at{' '}
                {focusSummary.event.endAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </View>

          <View style={styles.ideaBlock}>
            <FormField
              label="Idea Dump"
              helperText="Capture the thought now. It will be stored in Notes for later processing."
              error={saveError}
              accessibilityLabel="Idea dump input"
              placeholder="Write the thought you do not want to lose..."
              placeholderTextColor={styles.ideaInput.color}
              value={ideaBody}
              onChangeText={setIdeaBody}
              multiline
              containerStyle={styles.ideaField}
              labelStyle={styles.ideaTitle}
              inputStyle={styles.ideaInput}
              helperStyle={styles.ideaDescription}
              errorStyle={styles.errorText}
            />
            <AppButton
              accessibilityLabel="Save idea dump"
              onPress={handleSaveIdeaDump}
              label="Save to Notes"
              loading={saving}
              loadingLabel="Saving..."
            />
            <View style={styles.ideaMeta}>
              <Text style={styles.ideaCount}>Ideas captured: {savedCount}</Text>
              {showSavedConfirmation ? <Text style={styles.savedText}>Saved</Text> : null}
            </View>
          </View>

          <View style={styles.utilityBlock}>
            <Text style={styles.distractionStatus}>
              {dndStatus === 'blocked'
                ? 'Distractions blocked'
                : dndStatus === 'not-granted'
                  ? 'Distraction protection not granted'
                  : dndStatus === 'checking'
                    ? 'Checking distraction protection...'
                    : 'Distraction protection unavailable on this device'}
            </Text>
            <View style={styles.utilityButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Session Details"
                onPress={() =>
                  Alert.alert(
                    'Session Details',
                    `${focusSummary.title}\n${
                      focusSummary.event
                        ? `Scheduled duration: ${formatDuration(
                            focusSummary.event.endAt.getTime() -
                              focusSummary.event.startAt.getTime(),
                          )}`
                        : 'No linked calendar event.'
                    }`,
                  )
                }
                style={({ pressed }) => [
                  styles.utilityIconButton,
                  pressed ? styles.utilityIconButtonPressed : null,
                ]}
              >
                <AppIcon name="duration" size={20} color={theme.colors.textPrimary} decorative />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Focus Settings"
                onPress={() =>
                  Alert.alert(
                    'Focus Settings',
                    dndStatus === 'not-granted'
                      ? 'Allow Android Do Not Disturb access to enable distraction protection.'
                      : 'Timer sound and distraction protection follow your current profile and device settings.',
                    dndStatus === 'not-granted'
                      ? [
                          { text: 'Not now', style: 'cancel' },
                          {
                            text: 'Open Settings',
                            onPress: () => void dndService.openPolicyAccessSettings(),
                          },
                        ]
                      : [{ text: 'Done' }],
                  )
                }
                style={({ pressed }) => [
                  styles.utilityIconButton,
                  pressed ? styles.utilityIconButtonPressed : null,
                ]}
              >
                <AppIcon name="settings" size={20} color={theme.colors.textPrimary} decorative />
              </Pressable>
            </View>
          </View>

          <View style={styles.exitBlock}>
            <Text style={styles.exitLabel}>Hold to exit Focus Mode</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hold to return to calendar"
              onPressIn={handlePressInExit}
              onPressOut={handlePressOutExit}
              style={({ pressed }) => [
                styles.exitButton,
                pressed ? styles.exitButtonPressed : null,
              ]}
            >
              <View style={styles.exitProgressTrack}>
                <View style={[styles.exitProgressFill, { width: `${holdProgress * 100}%` }]} />
              </View>
              <Text style={styles.exitButtonText}>
                {holdProgress > 0 ? `Keep holding ${holdSecondsRemaining}s` : 'Hold for 3 seconds'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      justifyContent: 'space-between',
      gap: theme.spacing.xl,
    },
    heroBlock: {
      gap: theme.spacing.sm,
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
    },
    eyebrow: {
      ...theme.typography.label,
      color: theme.colors.focusGreen,
    },
    eventTitle: {
      ...theme.typography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.text,
      textAlign: 'center',
    },
    eventSubtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    timerCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.xs,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.focusGreen,
      backgroundColor: theme.colors.surfaceBrand,
    },
    timerLabel: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    timerValue: {
      fontSize: 48,
      lineHeight: 56,
      fontWeight: '700',
      color: theme.colors.focusGreen,
    },
    endTime: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    ideaBlock: {
      gap: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.focusGreen,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
    },
    ideaField: {},
    ideaTitle: {
      ...theme.typography.sectionTitle,
      color: theme.colors.text,
    },
    ideaDescription: {
      ...theme.typography.helper,
      color: theme.colors.textSecondary,
    },
    ideaInput: {
      height: 112,
      borderRadius: theme.radii.md,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
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
      color: theme.colors.textSecondary,
    },
    savedText: {
      ...theme.typography.helper,
      color: theme.colors.focusGreen,
    },
    utilityBlock: {
      gap: theme.spacing.sm,
    },
    distractionStatus: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceBrand,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    utilityButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    utilityIconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    utilityIconButtonPressed: {
      opacity: 0.75,
    },
    exitBlock: {
      gap: theme.spacing.sm,
    },
    exitLabel: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
    },
    exitButton: {
      alignItems: 'stretch',
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.focusGreen,
      backgroundColor: theme.colors.surfaceRaised,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    exitButtonPressed: {
      opacity: 0.92,
    },
    exitProgressTrack: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
    },
    exitProgressFill: {
      height: '100%',
      backgroundColor: theme.colors.focusGreen,
    },
    exitButtonText: {
      ...theme.typography.button,
      color: theme.colors.text,
      textAlign: 'center',
    },
  });
