import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppButton, AppButtonVariant } from './AppButton';
import { AppIcon } from './AppIcon';
import type { AppIconName } from '../../design/icons';
import { useTheme } from '../../design/ThemeProvider';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type EmptyStatePresentation = 'compact' | 'screen';

export type EmptyStateProps = {
  icon?: AppIconName;
  title: string;
  description?: string;
  presentation?: EmptyStatePresentation;
  actionLabel?: string;
  onPressAction?: () => void;
  actionVariant?: AppButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  icon,
  title,
  description,
  presentation = 'screen',
  actionLabel,
  onPressAction,
  actionVariant = 'primary',
  style,
}: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const isCompact = presentation === 'compact';

  return (
    <View style={[styles.container, isCompact ? styles.compact : styles.screen, style]}>
      {icon ? (
        <AppIcon
          name={icon}
          size={isCompact ? 24 : 40}
          color={theme.colors.brand}
          accessibilityLabel={`${title} icon`}
        />
      ) : null}
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, isCompact && styles.compactTitle]}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.description, isCompact && styles.compactDescription]}>
            {description}
          </Text>
        ) : null}
      </View>
      {actionLabel && onPressAction ? (
        <AppButton label={actionLabel} variant={actionVariant} onPress={onPressAction} />
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    screen: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: theme.spacing['3xl'],
    },
    compact: {
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.md,
    },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    title: {
      ...theme.typography.sectionTitle,
      color: theme.colors.text,
      textAlign: 'center',
    },
    compactTitle: {
      ...theme.typography.helper,
      fontWeight: '600',
      textAlign: 'center',
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    compactDescription: {
      ...theme.typography.caption,
    },
  });
