import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIconName } from '../../design/icons';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { radii, spacing, typography } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';

export type TaskListDropdownOption = {
  value: string;
  label: string;
  icon: AppIconName;
  count?: number;
};

type TaskListDropdownProps = {
  title: string;
  accessibilityLabel: string;
  icon: AppIconName;
  isOpen: boolean;
  onToggle: () => void;
  value: string;
  options: readonly TaskListDropdownOption[];
  onSelect: (value: string) => void;
};

const MENU_WIDTH = 224;

export function TaskListDropdown({
  title,
  accessibilityLabel,
  icon,
  isOpen,
  onToggle,
  value,
  options,
  onSelect,
}: TaskListDropdownProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const anchorRef = useRef<View>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    setPosition({ top: 58 + spacing.xs, left: 0 });
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuHeight = Math.min(options.length * 48, 300);
      const below = y + height + spacing.xs;
      const top =
        below + menuHeight <= windowHeight - insets.bottom
          ? below
          : Math.max(insets.top + spacing.sm, y - menuHeight - spacing.xs);
      const left = Math.max(spacing.sm, Math.min(x, windowWidth - MENU_WIDTH - spacing.sm));
      setPosition({ top: top - y, left: left - x });
    });
  }, [insets.bottom, insets.top, isOpen, options.length, windowHeight, windowWidth]);

  return (
    <View
      ref={anchorRef}
      collapsable={false}
      style={[styles.anchor, isOpen ? styles.anchorOpen : null]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${selectedOption?.label ?? ''}`}
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.trigger,
          isOpen ? styles.triggerOpen : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.triggerTop}>
          <AppIcon name={icon} size={16} color={styles.triggerIcon.color} decorative />
          <Text style={styles.triggerLabel}>{title}</Text>
          <AppIcon
            name={isOpen ? 'collapse' : 'expand'}
            size={14}
            color={styles.triggerIcon.color}
            decorative
          />
        </View>
        <Text numberOfLines={1} style={styles.triggerValue}>
          {selectedOption?.label ?? 'Choose'}
        </Text>
      </Pressable>

      {position ? (
        <View
          accessibilityLabel={`${title} options`}
          style={[styles.menu, { top: position.top, left: position.left }]}
        >
          <ScrollView bounces={false} style={styles.optionList}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${option.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    selected ? styles.optionSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <AppIcon
                    name={option.icon}
                    size={18}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}
                  >
                    {option.label}
                  </Text>
                  {option.count !== undefined ? (
                    <Text style={styles.optionCount}>{option.count}</Text>
                  ) : null}
                  {selected ? (
                    <AppIcon
                      name="complete"
                      size={16}
                      color={styles.selectedIcon.color}
                      decorative
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    anchor: { flex: 1, minWidth: 0, zIndex: 1 },
    anchorOpen: { zIndex: 20, elevation: 20 },
    trigger: {
      minHeight: 58,
      justifyContent: 'center',
      gap: 3,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    triggerOpen: { backgroundColor: theme.colors.surfaceBrand },
    triggerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    triggerIcon: { color: theme.colors.brand },
    triggerLabel: { ...typography.caption, color: theme.colors.textSecondary, flex: 1 },
    triggerValue: { ...typography.helper, color: theme.colors.text, fontWeight: '600' },
    menu: {
      position: 'absolute',
      width: MENU_WIDTH,
      maxHeight: 300,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceRaised,
      padding: spacing.xs,
      shadowColor: theme.colors.text,
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 8,
      zIndex: 20,
    },
    optionList: { flexGrow: 0 },
    option: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
    },
    optionSelected: { backgroundColor: theme.colors.surfaceBrand },
    optionIcon: { color: theme.colors.textSecondary },
    selectedIcon: { color: theme.colors.brand },
    optionLabel: { ...typography.helper, color: theme.colors.text, flex: 1 },
    optionLabelSelected: { color: theme.colors.brand, fontWeight: '700' },
    optionCount: { ...typography.caption, color: theme.colors.textSecondary },
    pressed: { opacity: 0.76 },
  });
