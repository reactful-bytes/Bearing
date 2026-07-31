import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { PROFILE_SOUND_OPTIONS } from '../../features/profile/profileSounds';

type SoundPickerModalProps = {
  visible: boolean;
  title: string;
  selectedSoundId: string;
  playingSoundId: string | null;
  previewError: string | null;
  savePending: boolean;
  onClose: () => void;
  onPreview: (soundId: string) => Promise<void>;
  onSelect: (soundId: string) => Promise<void>;
};

export function SoundPickerModal({
  visible,
  title,
  selectedSoundId,
  playingSoundId,
  previewError,
  savePending,
  onClose,
  onPreview,
  onSelect,
}: SoundPickerModalProps) {
  return (
    <AppModal visible={visible} title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          These app-generated tones are safe to ship and can be previewed before you save.
        </Text>

        {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}

        {PROFILE_SOUND_OPTIONS.map((sound) => {
          const isSelected = sound.id === selectedSoundId;
          const isPlaying = sound.id === playingSoundId;

          return (
            <AppCard key={sound.id} style={styles.soundCard}>
              <View style={styles.soundCopy}>
                <Text style={styles.soundTitle}>{sound.label}</Text>
                <Text style={styles.soundDescription}>{sound.description}</Text>
                <Text style={styles.soundMeta}>
                  {isSelected ? 'Currently selected' : 'Tap Select to use this sound'}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <AppButton
                  label={isPlaying ? 'Playing...' : 'Preview'}
                  variant="secondary"
                  accessibilityLabel={`Preview sound ${sound.label}`}
                  onPress={() => void onPreview(sound.id)}
                  style={styles.actionButton}
                />

                <AppButton
                  label={isSelected ? 'Selected' : 'Select'}
                  variant={isSelected ? 'secondary' : 'primary'}
                  accessibilityLabel={`Select sound ${sound.label}`}
                  onPress={() => void onSelect(sound.id)}
                  disabled={savePending}
                  loading={savePending && !isSelected}
                  loadingLabel="Saving..."
                  style={[styles.actionButton, isSelected ? styles.selectedButton : null]}
                  textStyle={isSelected ? styles.selectedButtonText : undefined}
                />
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  soundCard: {
    gap: spacing.md,
  },
  soundCopy: {
    gap: spacing.xs,
  },
  soundTitle: {
    ...typography.button,
    color: colors.text,
  },
  soundDescription: {
    ...typography.body,
    color: colors.textPrimary,
  },
  soundMeta: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  selectedButton: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectedButtonText: {
    ...typography.button,
    color: colors.brand,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
