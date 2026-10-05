import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import type { AppIconName } from '../../design/icons';
import { AppIcon } from './AppIcon';

export type MultiSelectDropdownOption = {
  id: string;
  label: string;
  icon: AppIconName;
};

type MultiSelectDropdownProps = {
  selectionMode?: 'multiple' | 'single';
  sectionLabel: string;
  triggerIcon: AppIconName;
  selectedSummary: string;
  triggerAccessibilityLabel: string;
  optionAccessibilityLabel: (option: MultiSelectDropdownOption) => string;
  options: readonly MultiSelectDropdownOption[];
  selectedIds: ReadonlySet<string>;
  emptyMessage?: string;
  clearAccessibilityLabel?: string;
  onToggle: (id: string) => void;
  onClear?: () => void;
};

export function MultiSelectDropdown({
  selectionMode = 'multiple',
  sectionLabel,
  triggerIcon,
  selectedSummary,
  triggerAccessibilityLabel,
  optionAccessibilityLabel,
  options,
  selectedIds,
  emptyMessage = 'No options available.',
  clearAccessibilityLabel,
  onToggle,
  onClear,
}: MultiSelectDropdownProps) {
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const anchorRef = useRef<View>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const showClear = selectionMode === 'multiple' && selectedIds.size > 0 && onClear;
  const menuHeight = Math.max(48, Math.min(options.length * 48, 224)) + (showClear ? 52 : 16);
  const menuWidth = anchor?.width ? Math.min(anchor.width, windowWidth - spacing.md * 2) : windowWidth - spacing.md * 2;
  const menuLeft = anchor
    ? Math.max(spacing.md, Math.min(anchor.x, windowWidth - menuWidth - spacing.md))
    : spacing.md;
  const belowTop = (anchor?.y ?? spacing.md) + (anchor?.height ?? 0) + spacing.xs;
  const menuTop = belowTop + menuHeight <= windowHeight - spacing.md
    ? belowTop
    : Math.max(spacing.md, (anchor?.y ?? spacing.md) - menuHeight - spacing.xs);

  function openMenu(): void {
    setExpanded(true);
    const trigger = anchorRef.current;
    if (!trigger) {
      return;
    }
    trigger.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{sectionLabel}</Text>
      <View ref={anchorRef} collapsable={false} style={styles.triggerAnchor}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triggerAccessibilityLabel}
          accessibilityState={{ expanded }}
          onPress={() => (expanded ? setExpanded(false) : openMenu())}
          style={({ pressed }) => [styles.trigger, pressed ? styles.pressed : null]}
        >
          <AppIcon name={triggerIcon} size={18} color={styles.triggerIcon.color} decorative />
          <Text numberOfLines={1} style={styles.triggerText}>
            {selectedSummary}
          </Text>
          {selectionMode === 'multiple' && selectedIds.size > 0 ? (
            <View style={styles.selectionCount}>
              <Text style={styles.selectionCountText}>{selectedIds.size}</Text>
            </View>
          ) : null}
          <AppIcon
            name={expanded ? 'collapse' : 'expand'}
            size={16}
            color={styles.triggerIcon.color}
            decorative
          />
        </Pressable>

      </View>
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.menuLayer}>
          <Pressable
            testID="dropdown-menu-backdrop"
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${sectionLabel.toLowerCase()} menu`}
            onPress={() => setExpanded(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            testID="multi-select-dropdown-menu"
            style={[styles.dropdown, { top: menuTop, left: menuLeft, width: menuWidth }]}
          >
            {options.length === 0 ? (
              <Text style={styles.emptyMessage}>{emptyMessage}</Text>
            ) : (
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.optionList}
                contentContainerStyle={styles.optionListContent}
                showsVerticalScrollIndicator={options.length > 4}
              >
                {options.map((option) => {
                  const selected = selectedIds.has(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole={selectionMode === 'multiple' ? 'checkbox' : 'radio'}
                      accessibilityLabel={optionAccessibilityLabel(option)}
                      accessibilityState={
                        selectionMode === 'multiple' ? { checked: selected } : { selected }
                      }
                      onPress={() => {
                        onToggle(option.id);
                        if (selectionMode === 'single') setExpanded(false);
                      }}
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
                      <Text numberOfLines={1} style={styles.optionLabel}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {showClear ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={clearAccessibilityLabel}
                onPress={onClear}
                style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.clearText}>Clear selection</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { position: 'relative', zIndex: 2, elevation: 2, gap: spacing.sm },
    label: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    triggerAnchor: { position: 'relative', zIndex: 3 },
    menuLayer: { flex: 1 },
    trigger: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
    },
    triggerIcon: { color: theme.colors.brand },
    triggerText: {
      ...typography.helper,
      color: theme.colors.textPrimary,
      fontWeight: '600',
      flex: 1,
      minWidth: 0,
    },
    selectionCount: {
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceBrand,
      paddingHorizontal: spacing.xs,
    },
    selectionCountText: { ...typography.caption, color: theme.colors.brand, fontWeight: '700' },
    dropdown: {
      position: 'absolute',
      zIndex: 20,
      elevation: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      padding: spacing.xs,
    },
    optionList: { maxHeight: 224, marginRight: spacing.xs },
    optionListContent: { paddingRight: spacing.xs },
    option: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: theme.radii.sm,
      paddingHorizontal: spacing.sm,
    },
    optionSelected: { backgroundColor: theme.colors.surfaceBrand },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
    optionLabel: { ...typography.helper, color: theme.colors.text, fontWeight: '600', flex: 1 },
    clearButton: {
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      marginTop: spacing.xs,
    },
    clearText: { ...typography.caption, color: theme.colors.brand, fontWeight: '600' },
    emptyMessage: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
    },
    pressed: { opacity: 0.76 },
  });