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
};

export function ListItem({
  title,
  description,
  trailingText,
  icon,
  onPress,
  disabled = false,
}: ListItemProps) {
  const styles = useThemedStyles(createStyles);
  const leadingIcon = icon ? (
    <View style={styles.iconMark}>
      <AppIcon name={icon} size={18} color={styles.icon.color} decorative />
    </View>
  ) : null;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }: { pressed?: boolean }) => [
          styles.item,
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
    <View style={[styles.item, disabled ? styles.itemDisabled : null]}>
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
