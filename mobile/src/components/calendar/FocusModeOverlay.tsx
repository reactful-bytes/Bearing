import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { radii, spacing, typography } from '../../design/tokens';
import { CalendarEvent } from '../../features/calendar/calendarTypes';
import { CreateNoteInput } from '../../features/notes/noteTypes';

type FocusModeOverlayProps = {
  visible: boolean;
  events: CalendarEvent[];
  preferredEventId?: string | null;
  onClose: () => void;
  onSaveIdeaDump: (input: CreateNoteInput) => Promise<void>;
};

const HOLD_TO_EXIT_MS = 3000;

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
  onClose,
  onSaveIdeaDump,
}: FocusModeOverlayProps) {
  const [now, setNow] = useState<Date>(new Date());
  const [ideaBody, setIdeaBody] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setIdeaBody('');
      setSaveError(null);
      setHoldProgress(0);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const focusSummary = useMemo(() => {
    const preferredEvent = preferredEventId
      ? events.find((event) => event.id === preferredEventId && now >= event.startAt && now < event.endAt) ?? null
      : null;
    const activeEvent = preferredEvent ?? events.find((event) => now >= event.startAt && now < event.endAt) ?? null;
    const nextEvent = activeEvent
      ? null
      : events.find((event) => event.startAt > now) ?? null;

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
        sourceStepId: focusSummary.event?.stepId ?? null,
      });
      setIdeaBody('');
    } catch {
      setSaveError('Failed to save Idea Dump. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const holdSecondsRemaining = Math.max(0, Math.ceil((1 - holdProgress) * 3));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.screen}>
        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Focus Mode</Text>
          <Text style={styles.eventTitle}>{focusSummary.title}</Text>
          <Text style={styles.eventSubtitle}>{focusSummary.subtitle}</Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>{focusSummary.timerLabel}</Text>
          <Text style={styles.timerValue}>{focusSummary.timerValue}</Text>
        </View>

        <View style={styles.ideaBlock}>
          <Text style={styles.ideaTitle}>Idea Dump</Text>
          <Text style={styles.ideaDescription}>
            Capture the thought now. It will be stored in Notes for later processing.
          </Text>
          <TextInput
            accessibilityLabel="Idea dump input"
            placeholder="Write the thought you do not want to lose..."
            placeholderTextColor="#7E9AAA"
            value={ideaBody}
            onChangeText={setIdeaBody}
            multiline
            textAlignVertical="top"
            style={styles.ideaInput}
          />
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save idea dump"
            onPress={handleSaveIdeaDump}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && !saving ? styles.saveButtonPressed : null,
              saving ? styles.saveButtonDisabled : null,
            ]}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save to Notes'}</Text>
          </Pressable>
        </View>

        <View style={styles.exitBlock}>
          <Text style={styles.exitLabel}>Return to Calendar</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hold to return to calendar"
            onPressIn={handlePressInExit}
            onPressOut={handlePressOutExit}
            style={({ pressed }) => [styles.exitButton, pressed ? styles.exitButtonPressed : null]}
          >
            <View style={styles.exitProgressTrack}>
              <View style={[styles.exitProgressFill, { width: `${holdProgress * 100}%` }]} />
            </View>
            <Text style={styles.exitButtonText}>
              {holdProgress > 0 ? `Keep holding ${holdSecondsRemaining}s` : 'Hold for 3 seconds'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07161F',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
    justifyContent: 'space-between',
    gap: spacing['2xl'],
  },
  heroBlock: {
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: '#8DB8CC',
  },
  eventTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: '#F4F8FA',
  },
  eventSubtitle: {
    ...typography.body,
    color: '#B7D0DC',
  },
  timerCard: {
    borderRadius: radii.xl,
    backgroundColor: '#0D2430',
    borderWidth: 1,
    borderColor: '#184255',
    padding: spacing['2xl'],
    gap: spacing.xs,
  },
  timerLabel: {
    ...typography.label,
    color: '#8DB8CC',
  },
  timerValue: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '700',
    color: '#F4F8FA',
  },
  ideaBlock: {
    flex: 1,
    gap: spacing.md,
  },
  ideaTitle: {
    ...typography.screenTitle,
    color: '#F4F8FA',
  },
  ideaDescription: {
    ...typography.body,
    color: '#B7D0DC',
  },
  ideaInput: {
    flex: 1,
    minHeight: 220,
    borderRadius: radii.xl,
    backgroundColor: '#0D2430',
    borderWidth: 1,
    borderColor: '#184255',
    color: '#F4F8FA',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  errorText: {
    ...typography.helper,
    color: '#FFB3B3',
  },
  saveButton: {
    borderRadius: radii.md,
    backgroundColor: '#0E5E85',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: '#F4F8FA',
  },
  exitBlock: {
    gap: spacing.sm,
  },
  exitLabel: {
    ...typography.label,
    color: '#8DB8CC',
  },
  exitButton: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#376277',
    backgroundColor: '#0D2430',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  exitButtonPressed: {
    opacity: 0.92,
  },
  exitProgressTrack: {
    height: 8,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: '#173847',
  },
  exitProgressFill: {
    height: '100%',
    backgroundColor: '#8DB8CC',
  },
  exitButtonText: {
    ...typography.button,
    color: '#F4F8FA',
    textAlign: 'center',
  },
});