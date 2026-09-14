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
    <View style={styles.container}>
      <View style={styles.avatarMark}>
        <Text style={styles.avatarInitial}>{(displayName || email || '?').trim().charAt(0).toUpperCase()}</Text>
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {displayName || 'Unnamed account'}
      </Text>
      <Text numberOfLines={1} style={styles.email}>
        {email || 'Anonymous session'}
      </Text>
      {isPremium ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Bearing 360</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.lg,
    },
    avatarMark: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.brand,
      marginBottom: spacing.sm,
    },
    avatarInitial: {
      ...typography.sectionTitle,
      color: theme.colors.surface,
    },
    name: {
      ...typography.cardTitle,
      color: theme.colors.text,
    },
    email: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    badge: {
      marginTop: spacing.sm,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: theme.colors.surfaceBrand,
    },
    badgeText: {
      ...typography.helper,
      fontWeight: '700',
      color: theme.colors.brand,
    },
  });
