import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { AppIconName } from '../../design/icons';
import { AppButton } from './AppButton';
import type { AppButtonVariant } from './AppButton';
import { AppIcon } from './AppIcon';

type ConfirmationIconTone = 'brand' | 'danger' | 'warning';

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: AppButtonVariant;
  cancelVariant?: AppButtonVariant;
  icon?: AppIconName;
  iconTone?: ConfirmationIconTone;
  confirmAccessibilityLabel?: string;
  cancelAccessibilityLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  cancelVariant = 'secondary',
  icon,
  iconTone = 'brand',
  confirmAccessibilityLabel = confirmLabel,
  cancelAccessibilityLabel = cancelLabel,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const styles = useThemedStyles(createStyles);
  const iconFrameToneStyle =
    iconTone === 'danger'
      ? styles.iconFrameDanger
      : iconTone === 'warning'
        ? styles.iconFrameWarning
        : styles.iconFrameBrand;
  const iconColorStyle =
    iconTone === 'danger'
      ? styles.iconDanger
      : iconTone === 'warning'
        ? styles.iconWarning
        : styles.iconBrand;

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title}`}
          onPress={onCancel}
          disabled={loading}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessible
          accessibilityViewIsModal
          accessibilityLabel={`${title} confirmation dialog`}
          style={styles.dialog}
        >
          {icon ? (
            <View style={[styles.iconFrame, iconFrameToneStyle]}>
              <AppIcon name={icon} size={22} color={iconColorStyle.color} decorative />
            </View>
          ) : null}
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <AppButton
              label={cancelLabel}
              variant={cancelVariant}
              accessibilityLabel={cancelAccessibilityLabel}
              onPress={onCancel}
              disabled={loading}
              style={styles.actionButton}
              textStyle={styles.actionButtonText}
            />
            <AppButton
              label={confirmLabel}
              variant={confirmVariant}
              accessibilityLabel={confirmAccessibilityLabel}
              onPress={onConfirm}
              loading={loading}
              loadingLabel="Deleting..."
              style={styles.actionButton}
              textStyle={styles.actionButtonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      backgroundColor: theme.colors.scrim,
    },
    dialog: {
      width: '100%',
      maxWidth: 420,
      gap: spacing.md,
      padding: spacing['2xl'],
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.elevated,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 20,
    },
    iconFrame: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    iconFrameBrand: {
      backgroundColor: theme.colors.surfaceBrand,
    },
    iconFrameDanger: {
      backgroundColor: theme.colors.dangerSurface,
    },
    iconFrameWarning: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconBrand: {
      color: theme.colors.brand,
    },
    iconDanger: {
      color: theme.colors.dangerText,
    },
    iconWarning: {
      color: theme.colors.warning,
    },
    title: {
      ...typography.sectionTitle,
      color: theme.colors.text,
    },
    message: {
      ...typography.body,
      color: theme.colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    actionButton: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: spacing.sm,
    },
    actionButtonText: {
      ...typography.helper,
      fontWeight: '700',
    },
  });
