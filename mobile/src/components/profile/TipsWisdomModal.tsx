import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ProfileTip } from '../../features/profile/profileTypes';

type TipsWisdomModalProps = {
  visible: boolean;
  tip: ProfileTip | null;
  onClose: () => void;
  onRefresh: () => void;
};

export function TipsWisdomModal({ visible, tip, onClose, onRefresh }: TipsWisdomModalProps) {
  return (
    <AppModal visible={visible} title="Tips & Wisdom" onClose={onClose}>
      {tip ? (
        <View style={styles.content}>
          <AppCard style={styles.tipCard}>
            <Text style={styles.tipLabel}>{tip.title}</Text>
            <Text style={styles.tipBody}>{tip.body}</Text>
          </AppCard>

          <View style={styles.actionsRow}>
            <AppButton
              label="Refresh"
              variant="secondary"
              accessibilityLabel="Refresh tip"
              onPress={onRefresh}
              style={styles.actionButton}
            />

            <AppButton
              label="Close"
              accessibilityLabel="Close tip modal"
              onPress={onClose}
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  tipCard: {
    gap: spacing.md,
  },
  tipLabel: {
    ...typography.label,
    color: colors.brand,
  },
  tipBody: {
    ...typography.body,
    color: colors.text,
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
  buttonPressed: {
    opacity: 0.85,
  },
});
