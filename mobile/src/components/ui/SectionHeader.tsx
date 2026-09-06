import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type SectionHeaderVariant = 'default' | 'compact' | 'uppercase-accent';

export type SectionHeaderProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
  actionLabel?: string;
  onPressAction?: () => void;
  variant?: SectionHeaderVariant;
};

export function SectionHeader({
  title,
  description,
  trailing,
  actionLabel,
  onPressAction,
  variant = 'default',
}: SectionHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const action =
    actionLabel && onPressAction ? (
      <AppButton
        label={actionLabel}
        onPress={onPressAction}
        style={styles.action}
        textStyle={styles.actionText}
      />
    ) : null;

  return (
    <View style={[styles.container, variant === 'compact' && styles.compactContainer]}>
      <View style={styles.copy}>
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            variant === 'compact' && styles.compactTitle,
            variant === 'uppercase-accent' && styles.uppercaseAccentTitle,
          ]}
        >
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing || action ? <View style={styles.trailing}>{trailing ?? action}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    compactContainer: {
      alignItems: 'center',
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs,
    },
    title: {
      ...theme.typography.sectionTitle,
      color: theme.colors.text,
    },
    compactTitle: {
      ...theme.typography.cardTitle,
    },
    uppercaseAccentTitle: {
      ...theme.typography.label,
      color: theme.colors.brand,
    },
    description: {
      ...theme.typography.helper,
      color: theme.colors.textSecondary,
    },
    trailing: {
      flexShrink: 1,
    },
    action: {
      minHeight: theme.layout.minimumTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    actionText: {
      ...theme.typography.helper,
    },
  });
