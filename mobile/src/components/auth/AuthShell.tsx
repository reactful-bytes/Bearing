import { Image, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { ReactNode } from 'react';

import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useTheme } from '../../design/ThemeProvider';

const bearingMarks = {
  dark: require('../../../assets/launch-mark-white.png'),
  light: require('../../../assets/launch-mark-blue.png'),
} as const;

type AuthShellProps = {
  heading: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ heading, description, children }: AuthShellProps) {
  const { preference } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Image
            accessibilityLabel="Bearing logo"
            source={bearingMarks[preference]}
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
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    shell: {
      width: '100%',
      backgroundColor: 'transparent',
    },
    content: {
      gap: spacing.xl,
      zIndex: 1,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    logo: {
      width: 124,
      height: 124,
      resizeMode: 'contain',
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
