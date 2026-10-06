import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppButton, AppButtonVariant } from './AppButton';
import { AppIcon } from './AppIcon';
import type { AppIconName } from '../../design/icons';
import { useTheme } from '../../design/ThemeProvider';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type EmptyStatePresentation = 'compact' | 'horizontal' | 'screen';

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
  const isHorizontal = presentation === 'horizontal';

  return (
    <View
      style={[
        styles.container,
        isCompact ? styles.compact : null,
        isHorizontal ? styles.horizontal : null,
        presentation === 'screen' ? styles.screen : null,
        style,
      ]}
    >
      {icon ? (
        <AppIcon
          name={icon}
          size={isCompact ? 24 : isHorizontal ? 28 : 40}
          color={theme.colors.brand}
          accessibilityLabel={`${title} icon`}
        />
      ) : null}
      <View style={[styles.copy, isHorizontal ? styles.horizontalCopy : null]}>
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            isCompact && styles.compactTitle,
            isHorizontal && styles.horizontalTitle,
          ]}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[
              styles.description,
              isCompact && styles.compactDescription,
              isHorizontal && styles.horizontalDescription,
            ]}
          >
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
    horizontal: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    horizontalCopy: { flexShrink: 1, alignItems: 'flex-start' },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    horizontalTitle: { ...theme.typography.helper, fontWeight: '600', textAlign: 'left' },
    horizontalDescription: { ...theme.typography.caption, textAlign: 'left' },
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
