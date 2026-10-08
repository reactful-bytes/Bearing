import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { AppIconName } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { CalendarDisplayEvent } from '../../features/calendar/calendarTypes';
import {
  DEFAULT_TIMER_SOUND_ID,
  PROFILE_SOUND_OPTIONS,
} from '../../features/profile/profileSounds';
import { useSoundPreview } from '../../features/profile/useSoundPreview';
import { AppButton } from '../ui/AppButton';
import { BottomSheet } from '../ui/BottomSheet';
import { AppIcon } from '../ui/AppIcon';
import { focusModeColors } from './focusModeColors';

export type FocusModeDndStatus = 'checking' | 'blocked' | 'not-granted' | 'unavailable' | 'off';
export type FocusModeUtilitySection = 'details' | 'environment' | 'settings';

type FocusModeUtilitySheetProps = {
  section: FocusModeUtilitySection | null;
  onDismiss: () => void;
  sessionTitle: string;
  linkedEvent: CalendarDisplayEvent | null;
  sessionStartedAt: Date;
  now: Date;
  timerLabel: string;
  timerValue: string;
  ideasCaptured: number;
  dndAvailable: boolean;
  dndEnabled: boolean;
  dndStatus: FocusModeDndStatus;
  dndError: string | null;
  showDndSettingsAction: boolean;
  onDndEnabledChange: (enabled: boolean) => void;
  onOpenDndSettings: () => void;
  timerSoundId?: string;
  onUpdateTimerSound?: (soundId: string) => Promise<void>;
  endAlertEnabled: boolean;
  onEndAlertEnabledChange: (enabled: boolean) => void;
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function formatEventTime(value: Date): string {
  return value.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FocusModeUtilitySheet({
  section,
  onDismiss,
  sessionTitle,
  linkedEvent,
  sessionStartedAt,
  now,
  timerLabel,
  timerValue,
  ideasCaptured,
  dndAvailable,
  dndEnabled,
  dndStatus,
  dndError,
  showDndSettingsAction,
  onDndEnabledChange,
  onOpenDndSettings,
  timerSoundId = DEFAULT_TIMER_SOUND_ID,
  onUpdateTimerSound,
  endAlertEnabled,
  onEndAlertEnabledChange,
}: FocusModeUtilitySheetProps) {
  const styles = useThemedStyles(createStyles);
  const { playingSoundId, previewError, previewSound, stopPreview } = useSoundPreview();
  const [selectedSoundId, setSelectedSoundId] = useState(timerSoundId);
  const [savingSoundId, setSavingSoundId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSoundId(timerSoundId);
  }, [timerSoundId]);

  useEffect(() => {
    if (section !== 'settings' && playingSoundId) {
      stopPreview();
    }
  }, [playingSoundId, section, stopPreview]);

  async function handleSelectSound(soundId: string): Promise<void> {
    if (!onUpdateTimerSound || savingSoundId) {
      return;
    }

    setSavingSoundId(soundId);
    setSaveError(null);
    try {
      await onUpdateTimerSound(soundId);
      setSelectedSoundId(soundId);
      stopPreview();
    } catch {
      setSaveError('Could not save this timer tone. Please try again.');
    } finally {
      setSavingSoundId(null);
    }
  }

  const title =
    section === 'details'
      ? 'Session Details'
      : section === 'environment'
        ? 'Focus Environment'
        : 'Focus Settings';
  const dndStatusMessage =
    dndStatus === 'unavailable' ? 'Do Not Disturb is unavailable on this device.' : null;

  function renderDetailRow(icon: AppIconName, label: string, value: string) {
    return (
      <View key={label} testID={`focus-detail-row-${label}`} style={styles.detailRow}>
        <AppIcon name={icon} size={18} color={styles.metricIcon.color} decorative />
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    );
  }

  return (
    <BottomSheet
      visible={section !== null}
      onDismiss={onDismiss}
      accessibilityLabel={title}
      testID="focus-utility-sheet"
      style={styles.sheet}
      handleColor={focusModeColors.sheetHandle}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" accessibilityLabel={title} style={styles.title}>
          {title}
        </Text>
      </View>

      <ScrollView
        testID="focus-utility-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollIndicatorInsets={{ right: 0 }}
        keyboardShouldPersistTaps="handled"
      >
        {section === 'details' ? (
          <>
            {linkedEvent ? (
              <>
                <View style={styles.linkedContext}>
                  <AppIcon
                    name={
                      linkedEvent.ownership === 'bearing' && linkedEvent.sourceTaskId
                        ? 'task'
                        : 'calendar'
                    }
                    size={20}
                    color={styles.metricIcon.color}
                    decorative
                  />
                  <View style={styles.contextCopy}>
                    <Text
                      style={
                        linkedEvent.ownership === 'bearing' && linkedEvent.sourceTaskId
                          ? styles.sectionLabel
                          : styles.detailLabel
                      }
                    >
                      {linkedEvent.ownership === 'bearing' && linkedEvent.sourceTaskId
                        ? 'LINKED TASK'
                        : 'Linked event'}
                    </Text>
                    <Text style={styles.contextTitle}>{linkedEvent.title}</Text>
                  </View>
                </View>
                <Text style={styles.sectionLabel}>Schedule</Text>
                {renderDetailRow(
                  'calendar',
                  'Scheduled start',
                  formatEventTime(linkedEvent.startAt),
                )}
                {renderDetailRow('calendar', 'Scheduled end', formatEventTime(linkedEvent.endAt))}
                {renderDetailRow(
                  'duration',
                  'Scheduled duration',
                  formatDuration(linkedEvent.endAt.getTime() - linkedEvent.startAt.getTime()),
                )}
              </>
            ) : (
              <View style={styles.linkedContext}>
                <AppIcon name="focus" size={20} color={styles.metricIcon.color} decorative />
                <View style={styles.contextCopy}>
                  <Text style={styles.contextTitle}>{sessionTitle}</Text>
                  <Text style={styles.description}>
                    No linked event or scheduled end for this focus session.
                  </Text>
                </View>
              </View>
            )}
            <Text style={styles.sectionLabel}>This session</Text>
            {linkedEvent ? renderDetailRow('duration', timerLabel, timerValue) : null}
            {renderDetailRow('calendar', 'Session started', formatEventTime(sessionStartedAt))}
            {renderDetailRow(
              'duration',
              'Session elapsed',
              formatDuration(now.getTime() - sessionStartedAt.getTime()),
            )}
            {renderDetailRow('idea', 'Ideas captured', String(ideasCaptured))}
          </>
        ) : null}

        {section === 'environment' ? (
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Do Not Disturb</Text>
                <Text testID="focus-dnd-description" style={styles.description}>
                  Turning this off only stops Do Not Disturb for this session. To revoke
                  Bearing&apos;s permission, remove Do Not Disturb access in Android system
                  settings.
                </Text>
              </View>
              <Switch
                testID="focus-dnd-toggle"
                accessibilityLabel="Do Not Disturb"
                value={dndEnabled}
                onValueChange={onDndEnabledChange}
                disabled={!dndAvailable}
                trackColor={{ false: styles.switchTrack.color, true: styles.switchActive.color }}
                thumbColor={styles.switchThumb.color}
              />
            </View>
            {dndStatusMessage ? <Text style={styles.description}>{dndStatusMessage}</Text> : null}
            {dndError ? <Text style={styles.errorText}>{dndError}</Text> : null}
            {showDndSettingsAction ? (
              <View style={styles.permissionAction}>
                <Text style={styles.description}>
                  Allow access to enable Do Not Disturb. Bearing will recheck when you return.
                </Text>
                <AppButton
                  label="Open Android Settings"
                  onPress={onOpenDndSettings}
                  style={styles.permissionButton}
                  textStyle={styles.permissionButtonText}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {section === 'settings' ? (
          <>
            <Text style={styles.sectionLabel}>Timer-end tone</Text>
            <Text style={styles.description}>
              Saved to Focus Preferences and used for future sessions.
            </Text>
            {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            {!onUpdateTimerSound ? (
              <Text style={styles.description}>A profile is required to save a timer tone.</Text>
            ) : null}
            {PROFILE_SOUND_OPTIONS.map((sound) => {
              const isSelected = sound.id === selectedSoundId;
              const isPlaying = sound.id === playingSoundId;

              return (
                <View key={sound.id} testID={`focus-sound-row-${sound.id}`} style={styles.soundRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isPlaying ? 'Stop' : 'Preview'} sound ${sound.label}`}
                    onPress={() => (isPlaying ? stopPreview() : void previewSound(sound.id))}
                    style={({ pressed }) => [
                      styles.soundPreviewTouchTarget,
                      pressed ? styles.soundPreviewPressed : null,
                    ]}
                  >
                    <View
                      testID={`focus-sound-preview-face-${sound.id}`}
                      pointerEvents="none"
                      style={styles.soundPreviewButton}
                    >
                      <AppIcon
                        name={isPlaying ? 'pause' : 'play'}
                        size={18}
                        color={styles.soundPreviewIcon.color}
                        decorative
                      />
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`Select timer tone ${sound.label}`}
                    accessibilityState={{
                      checked: isSelected,
                      disabled: !onUpdateTimerSound || savingSoundId !== null,
                    }}
                    disabled={!onUpdateTimerSound || savingSoundId !== null}
                    onPress={() => void handleSelectSound(sound.id)}
                    style={({ pressed }) => [
                      styles.soundOption,
                      pressed ? styles.soundOptionPressed : null,
                    ]}
                  >
                    <View style={styles.soundCopy}>
                      <Text
                        style={[styles.soundTitle, isSelected ? styles.soundTitleSelected : null]}
                      >
                        {sound.label}
                      </Text>
                      <Text style={styles.soundDescription}>{sound.description}</Text>
                    </View>
                    <AppIcon
                      name={isSelected ? 'complete' : 'none'}
                      size={18}
                      color={isSelected ? styles.soundTitleSelected.color : styles.soundTitle.color}
                      style={styles.soundSelectionMark}
                      decorative
                    />
                  </Pressable>
                </View>
              );
            })}
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Show end-of-session alert</Text>
                <Text style={styles.description}>Applies to this session only.</Text>
              </View>
              <Switch
                testID="focus-end-alert-toggle"
                accessibilityLabel="Show end-of-session alert"
                value={endAlertEnabled}
                onValueChange={onEndAlertEnabledChange}
                trackColor={{ false: styles.switchTrack.color, true: styles.switchActive.color }}
                thumbColor={styles.switchThumb.color}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    title: {
      ...theme.typography.caption,
      color: focusModeColors.greenLight,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    sheet: {
      backgroundColor: focusModeColors.sheetBackground,
    },
    scroll: {
      flexShrink: 1,
      minHeight: 0,
      marginHorizontal: -theme.spacing['2xl'],
    },
    content: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing['2xl'],
    },
    description: {
      ...theme.typography.helper,
      color: focusModeColors.sheetTextSecondary,
    },
    contextTitle: {
      ...theme.typography.body,
      color: focusModeColors.sheetText,
      fontWeight: '600',
    },
    linkedContext: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: focusModeColors.sheetBorder,
    },
    detailLabel: {
      ...theme.typography.helper,
      color: focusModeColors.sheetTextSecondary,
      flex: 1,
    },
    sectionLabel: {
      ...theme.typography.caption,
      color: focusModeColors.sheetText,
      fontWeight: '700',
      textTransform: 'uppercase',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    detailRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: focusModeColors.sheetBorder,
    },
    metricIcon: {
      color: focusModeColors.green,
    },
    metricValue: {
      ...theme.typography.helper,
      color: focusModeColors.sheetText,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    contextCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    soundCopy: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
    },
    settingRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: focusModeColors.sheetBorder,
    },
    settingCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    settingTitle: {
      ...theme.typography.caption,
      color: focusModeColors.sheetText,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    permissionAction: {
      gap: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.helper,
      color: focusModeColors.dangerText,
    },
    permissionButton: {
      backgroundColor: focusModeColors.sheetRaised,
      borderWidth: 1,
      borderColor: focusModeColors.green,
    },
    permissionButtonText: {
      color: focusModeColors.greenLight,
    },
    soundRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: 64,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: focusModeColors.sheetBorder,
    },
    soundOption: {
      flex: 1,
      minWidth: 0,
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    soundOptionPressed: {
      opacity: 0.78,
    },
    soundTitle: {
      ...theme.typography.label,
      color: focusModeColors.sheetText,
      textAlign: 'left',
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    soundTitleSelected: {
      fontWeight: '700',
      color: focusModeColors.greenLight,
    },
    soundSelectionMark: {
      flexShrink: 0,
      marginLeft: theme.spacing.sm,
    },
    soundDescription: {
      ...theme.typography.caption,
      color: focusModeColors.textSecondary,
      textAlign: 'left',
    },
    soundPreviewButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focusModeColors.sheetRaised,
      borderWidth: 1,
      borderColor: focusModeColors.sheetBorder,
    },
    soundPreviewTouchTarget: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    soundPreviewPressed: { opacity: 0.72 },
    soundPreviewIcon: { color: focusModeColors.sheetText },
    switchTrack: {
      color: focusModeColors.sheetRaised,
    },
    switchActive: {
      color: focusModeColors.greenStrong,
    },
    switchThumb: {
      color: focusModeColors.sheetText,
    },
  });
