import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { AppIconName } from '../../design/icons';
import { AppButton } from './AppButton';
import type { AppButtonVariant } from './AppButton';
import { AppIcon } from './AppIcon';

type ConfirmationIconTone = 'brand' | 'danger' | 'warning';

type ConfirmationDestructiveAction = {
  label: string;
  accessibilityLabel: string;
  variant?: AppButtonVariant;
  loadingLabel?: string;
  loading?: boolean;
  onPress: () => void;
};

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmFirst?: boolean;
  confirmVariant?: AppButtonVariant;
  cancelVariant?: AppButtonVariant;
  icon?: AppIconName;
  iconTone?: ConfirmationIconTone;
  confirmAccessibilityLabel?: string;
  cancelAccessibilityLabel?: string;
  loading?: boolean;
  destructiveAction?: ConfirmationDestructiveAction;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmFirst = false,
  confirmVariant = 'primary',
  cancelVariant = 'secondary',
  icon,
  iconTone = 'brand',
  confirmAccessibilityLabel = confirmLabel,
  cancelAccessibilityLabel = cancelLabel,
  loading = false,
  destructiveAction,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const styles = useThemedStyles(createStyles);
  const isActionLoading = loading || destructiveAction?.loading === true;
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
  const cancelButton = (
    <AppButton
      label={cancelLabel}
      variant={cancelVariant}
      accessibilityLabel={cancelAccessibilityLabel}
      onPress={onCancel}
      disabled={isActionLoading}
      style={styles.actionButton}
      textStyle={styles.actionButtonText}
    />
  );
  const confirmButton = (
    <AppButton
      label={confirmLabel}
      variant={confirmVariant}
      accessibilityLabel={confirmAccessibilityLabel}
      onPress={onConfirm}
      disabled={isActionLoading}
      loading={loading}
      loadingLabel="Deleting..."
      style={styles.actionButton}
      textStyle={styles.actionButtonText}
    />
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!isActionLoading) onCancel();
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title}`}
          onPress={onCancel}
          disabled={isActionLoading}
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
          <View style={styles.actionStack}>
            {destructiveAction ? (
              <View style={styles.destructiveActionGroup}>
                <AppButton
                  label={destructiveAction.label}
                  variant={destructiveAction.variant ?? 'danger'}
                  accessibilityLabel={destructiveAction.accessibilityLabel}
                  onPress={destructiveAction.onPress}
                  disabled={isActionLoading}
                  loading={destructiveAction.loading}
                  loadingLabel={destructiveAction.loadingLabel}
                  style={styles.destructiveActionButton}
                  textStyle={styles.actionButtonText}
                />
                <View style={styles.actionDivider} />
              </View>
            ) : null}
            <View style={styles.actions}>
              {confirmFirst ? confirmButton : cancelButton}
              {confirmFirst ? cancelButton : confirmButton}
            </View>
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
    actionStack: {
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    destructiveActionButton: {
      width: '100%',
      minWidth: 0,
    },
    destructiveActionGroup: {
      gap: spacing.md,
    },
    actionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
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
