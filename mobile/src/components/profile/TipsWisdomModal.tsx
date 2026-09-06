import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { ProfileTip } from '../../features/profile/profileTypes';

type TipsWisdomModalProps = {
  visible: boolean;
  tip: ProfileTip | null;
  onClose: () => void;
  onRefresh: () => void;
};

export function TipsWisdomModal({ visible, tip, onClose, onRefresh }: TipsWisdomModalProps) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    tipCard: {
      gap: spacing.md,
    },
    tipLabel: {
      ...typography.label,
      color: theme.colors.brand,
    },
    tipBody: {
      ...typography.body,
      color: theme.colors.text,
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
      backgroundColor: theme.colors.brand,
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    primaryButtonText: {
      ...typography.button,
      color: theme.colors.surface,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    secondaryButtonText: {
      ...typography.button,
      color: theme.colors.textPrimary,
    },
    buttonPressed: {
      opacity: 0.85,
    },
  });
