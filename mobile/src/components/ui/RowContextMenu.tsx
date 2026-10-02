import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppIconName } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

export type RowContextMenuItem = {
  label: string;
  accessibilityLabel: string;
  icon: AppIconName;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

type RowContextMenuProps = {
  accessibilityLabel: string;
  menuAccessibilityLabel: string;
  items: readonly RowContextMenuItem[];
  visible?: boolean;
  onToggle?: () => void;
};

export function RowContextMenu({
  accessibilityLabel,
  menuAccessibilityLabel,
  items,
  visible: controlledVisible,
  onToggle,
}: RowContextMenuProps) {
  const styles = useThemedStyles(createStyles);
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = controlledVisible ?? internalVisible;

  function toggleMenu(): void {
    if (onToggle) onToggle();
    else setInternalVisible((current) => !current);
  }

  function closeMenu(): void {
    if (onToggle) onToggle();
    else setInternalVisible(false);
  }

  return (
    <View style={[styles.anchor, visible ? styles.anchorOpen : null]}>
      <IconButton
        name="moreVertical"
        accessibilityLabel={accessibilityLabel}
        onPress={toggleMenu}
      />
      {visible ? (
        <View accessibilityLabel={menuAccessibilityLabel} style={styles.menu}>
          {items.map((item) => {
            const danger = item.tone === 'danger';
            return (
              <Pressable
                key={item.accessibilityLabel}
                accessibilityRole="menuitem"
                accessibilityLabel={item.accessibilityLabel}
                onPress={() => {
                  closeMenu();
                  item.onPress();
                }}
                style={({ pressed }) => [styles.menuItem, pressed ? styles.pressed : null]}
              >
                <AppIcon
                  name={item.icon}
                  size={18}
                  color={danger ? styles.deleteIcon.color : styles.menuIcon.color}
                  decorative
                />
                <Text style={[styles.menuText, danger ? styles.deleteText : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    anchor: { position: 'relative' },
    anchorOpen: { zIndex: 13, elevation: 13 },
    menu: {
      position: 'absolute',
      top: '70%',
      right: 0,
      minWidth: 176,
      padding: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      zIndex: 13,
      elevation: 13,
    },
    menuItem: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
    },
    menuIcon: { color: theme.colors.textSecondary },
    deleteIcon: { color: theme.colors.dangerText },
    menuText: { ...typography.label, color: theme.colors.text },
    deleteText: { color: theme.colors.dangerText },
    pressed: { backgroundColor: theme.colors.surfaceMuted },
  });
