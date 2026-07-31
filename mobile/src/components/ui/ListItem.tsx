import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, componentTokens, spacing, typography } from '../../design/tokens';

type ListItemProps = {
  title: string;
  description?: string;
  trailingText?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function ListItem({
  title,
  description,
  trailingText,
  onPress,
  disabled = false,
}: ListItemProps) {
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
      <View style={styles.copyBlock}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailingText ? <Text style={styles.trailingText}>{trailingText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: componentTokens.card.borderRadius,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: componentTokens.tabBar.borderTopColor,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPressed: {
    opacity: 0.9,
  },
  itemDisabled: {
    opacity: 0.6,
  },
  copyBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.button,
    color: colors.text,
  },
  description: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  trailingText: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '600',
  },
});
