import { Image, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { ReactNode } from 'react';

import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type AuthShellProps = {
  heading: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ heading, description, children }: AuthShellProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.shell}>
      <View style={styles.brandRow}>
        <Image
          accessibilityLabel="Bearing logo"
          source={require('../../../assets/logoBlueBackground.png')}
          style={styles.logo}
        />
        <View style={styles.brandCopy}>
          <Text accessibilityRole="header" style={styles.brandName}>
            Bearing
          </Text>
          <Text style={styles.tagline}>Your day, with direction.</Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.heading}>
          {heading}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {children}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    shell: {
      width: '100%',
      gap: spacing.xl,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    logo: {
      width: 84,
      height: 84,
      borderRadius: radii.md,
    },
    brandCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    brandName: {
      ...typography.title,
      color: theme.colors.text,
    },
    tagline: {
      ...typography.body,
      color: theme.colors.textSecondary,
    },
    intro: {
      gap: spacing.sm,
    },
    heading: {
      ...typography.screenTitle,
      color: theme.colors.text,
    },
    description: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
  });
