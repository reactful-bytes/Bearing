import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { AppIcon } from './AppIcon';
import type { AppIconName } from '../../design/icons';

type ListItemProps = {
  title: string;
  accessibilityLabel?: string;
  description?: ReactNode;
  trailingText?: string;
  trailingTextColor?: string;
  trailingContent?: ReactNode;
  trailingContentBelow?: boolean;
  icon?: AppIconName;
  onPress?: () => void;
  disabled?: boolean;
  /** 'card' (default) renders a standalone bordered card; 'row' renders a flat row for use inside a grouped section card. */
  variant?: 'card' | 'row';
  /** Only relevant for variant="row" — omit on the last row in a group. */
  showDivider?: boolean;
  colorTone?: 'default' | 'purple' | 'danger';
};

export function ListItem({
  title,
  accessibilityLabel,
  description,
  trailingText,
  trailingTextColor,
  trailingContent,
  trailingContentBelow = false,
  icon,
  onPress,
  disabled = false,
  variant = 'card',
  showDivider = true,
  colorTone = 'default',
}: ListItemProps) {
  const styles = useThemedStyles(createStyles);
  const toneColor =
    colorTone === 'danger'
      ? styles.danger.color
      : colorTone === 'purple'
        ? styles.purple.color
        : styles.icon.color;
  const leadingIcon = icon ? (
    <View style={variant === 'row' ? styles.rowIconMark : styles.iconMark}>
      <AppIcon name={icon} size={18} color={toneColor} decorative />
    </View>
  ) : null;
  const rowStyle =
    variant === 'row'
      ? [
          styles.row,
          trailingContentBelow ? styles.rowContentBelow : null,
          showDivider ? styles.rowDivider : null,
        ]
      : [styles.item, trailingContentBelow ? styles.itemContentBelow : null];
  const copyStyle = trailingContentBelow
    ? [styles.copyBlock, styles.copyBlockContentBelow]
    : styles.copyBlock;
  const trailingElement =
    trailingContent ??
    (trailingText ? (
      <Text
        style={[
          styles.trailingText,
          colorTone !== 'default' ? { color: toneColor } : null,
          trailingTextColor ? { color: trailingTextColor } : null,
        ]}
      >
        {trailingText}
      </Text>
    ) : null);
  const trailingView = trailingElement ? (
    <View style={trailingContentBelow ? styles.trailingContentBelow : null}>{trailingElement}</View>
  ) : null;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }: { pressed?: boolean }) => [
          rowStyle,
          pressed && !disabled ? styles.itemPressed : null,
          disabled ? styles.itemDisabled : null,
        ]}
      >
        {leadingIcon}
        <View style={copyStyle}>
          <Text style={[styles.title, colorTone !== 'default' ? { color: toneColor } : null]}>
            {title}
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {trailingView}
      </Pressable>
    );
  }

  return (
    <View style={[rowStyle, disabled ? styles.itemDisabled : null]}>
      {leadingIcon}
      <View style={copyStyle}>
        <Text style={[styles.title, colorTone !== 'default' ? { color: toneColor } : null]}>
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailingView}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    item: {
      borderRadius: theme.componentTokens.card.borderRadius,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: theme.componentTokens.tabBar.borderTopColor,
      gap: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    row: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowContentBelow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: 0,
    },
    itemContentBelow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: 0,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    itemPressed: {
      backgroundColor: theme.colors.surfacePressed,
    },
    itemDisabled: {
      opacity: 0.6,
    },
    iconMark: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceRaised,
    },
    rowIconMark: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      color: theme.colors.textSecondary,
    },
    purple: {
      color: theme.colors.purple,
    },
    danger: {
      color: theme.colors.dangerText,
    },
    copyBlock: {
      flex: 1,
      gap: spacing.xs,
    },
    copyBlockContentBelow: {
      flex: 0,
      width: '100%',
      minHeight: typography.button.fontSize + spacing.xs,
      paddingBottom: spacing.xs,
      zIndex: 1,
    },
    trailingContentBelow: {
      width: '100%',
      paddingTop: spacing.xs,
      flexShrink: 0,
    },
    title: {
      ...typography.button,
      color: theme.colors.text,
    },
    description: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    trailingText: {
      ...typography.helper,
      color: theme.colors.brand,
      fontWeight: '600',
    },
  });
