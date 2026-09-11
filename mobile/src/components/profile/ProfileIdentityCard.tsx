import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type ProfileIdentityCardProps = {
  displayName: string;
  email: string;
  isPremium?: boolean;
};

export function ProfileIdentityCard({
  displayName,
  email,
  isPremium = false,
}: ProfileIdentityCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.avatarMark}>
        <Text style={styles.avatarInitial}>{(displayName || email || '?').trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {displayName || 'Unnamed account'}
        </Text>
        <Text numberOfLines={1} style={styles.email}>
          {email || 'Anonymous session'}
        </Text>
      </View>
      {isPremium ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PRO</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarMark: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.brand,
    },
    avatarInitial: {
      ...typography.button,
      color: theme.colors.surface,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    name: {
      ...typography.button,
      color: theme.colors.text,
    },
    email: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    badge: {
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: theme.colors.surfaceBrand,
      borderWidth: 1,
      borderColor: theme.colors.brand,
    },
    badgeText: {
      ...typography.helper,
      fontWeight: '700',
      color: theme.colors.brand,
    },
  });
