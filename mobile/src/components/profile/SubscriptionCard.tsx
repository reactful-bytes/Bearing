import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { AppButton } from '../ui/AppButton';
import { AppIcon } from '../ui/AppIcon';

type SubscriptionCardProps = {
  hasPremiumAccess: boolean;
  description: string;
  actionLabel: string;
  onPressAction: () => void;
  actionPending?: boolean;
  errorMessage?: string | null;
};

export function SubscriptionCard({
  hasPremiumAccess,
  description,
  actionLabel,
  onPressAction,
  actionPending = false,
  errorMessage,
}: SubscriptionCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.card, hasPremiumAccess ? styles.cardActive : null]}>
      <View style={styles.header}>
        <View style={styles.iconMark}>
          <AppIcon name="billing" size={18} color={styles.icon.color} decorative />
        </View>
        <Text style={styles.planLabel}>{hasPremiumAccess ? 'BEARING 360' : 'FREE PLAN'}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <AppButton
        label={actionLabel}
        variant="secondary"
        accessibilityLabel={actionLabel}
        onPress={onPressAction}
        loading={actionPending}
        loadingLabel="Opening..."
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardActive: {
      borderColor: theme.colors.brand,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconMark: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceBrand,
    },
    icon: {
      color: theme.colors.brand,
    },
    planLabel: {
      ...typography.label,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: theme.colors.textSecondary,
    },
    description: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
  });
