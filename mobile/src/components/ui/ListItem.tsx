import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { AppIcon } from './AppIcon';
import type { AppIconName } from '../../design/icons';

type ListItemProps = {
  title: string;
  description?: string;
  trailingText?: string;
  icon?: AppIconName;
  onPress?: () => void;
  disabled?: boolean;
  /** 'card' (default) renders a standalone bordered card; 'row' renders a flat row for use inside a grouped section card. */
  variant?: 'card' | 'row';
  /** Only relevant for variant="row" — omit on the last row in a group. */
  showDivider?: boolean;
};

export function ListItem({
  title,
  description,
  trailingText,
  icon,
  onPress,
  disabled = false,
  variant = 'card',
  showDivider = true,
}: ListItemProps) {
  const styles = useThemedStyles(createStyles);
  const leadingIcon = icon ? (
    <View style={styles.iconMark}>
      <AppIcon name={icon} size={18} color={styles.icon.color} decorative />
    </View>
  ) : null;
  const rowStyle =
    variant === 'row' ? [styles.row, showDivider ? styles.rowDivider : null] : styles.item;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }: { pressed?: boolean }) => [
          rowStyle,
          pressed && !disabled ? styles.itemPressed : null,
          disabled ? styles.itemDisabled : null,
        ]}
      >
        {leadingIcon}
        <View style={styles.copyBlock}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {trailingText ? <Text style={styles.trailingText}>{trailingText}</Text> : null}
      </Pressable>
    );
  }

  return (
    <View style={[rowStyle, disabled ? styles.itemDisabled : null]}>
      {leadingIcon}
      <View style={styles.copyBlock}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailingText ? <Text style={styles.trailingText}>{trailingText}</Text> : null}
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
      paddingVertical: spacing.md,
      gap: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    icon: {
      color: theme.colors.textSecondary,
    },
    copyBlock: {
      flex: 1,
      gap: spacing.xs,
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
