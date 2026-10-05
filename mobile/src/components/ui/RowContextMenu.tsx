import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppIconName } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

let activeMenuId: string | null = null;
const menuListeners = new Set<() => void>();
const menuAnchors = new Map<string, () => View | null>();

function subscribeToMenu(listener: () => void): () => void {
  menuListeners.add(listener);
  return () => menuListeners.delete(listener);
}

function getActiveMenuId(): string | null {
  return activeMenuId;
}

function setActiveMenuId(menuId: string | null): void {
  if (activeMenuId === menuId) return;
  activeMenuId = menuId;
  menuListeners.forEach((listener) => listener());
}

export function toggleRowContextMenu(menuId: string): void {
  setActiveMenuId(activeMenuId === menuId ? null : menuId);
}

export function closeRowContextMenu(): void {
  setActiveMenuId(null);
}

function openMenuAtPoint(pageX: number, pageY: number): void {
  const anchors = [...menuAnchors.entries()];
  if (anchors.length === 0) {
    closeRowContextMenu();
    return;
  }

  let pendingMeasurements = anchors.length;
  const matches: { menuId: string; area: number }[] = [];
  const finishMeasurement = () => {
    pendingMeasurements -= 1;
    if (pendingMeasurements === 0) {
      const hit = matches.sort((left, right) => left.area - right.area)[0]?.menuId ?? null;
      setActiveMenuId(hit === activeMenuId ? null : hit);
    }
  };

  anchors.forEach(([menuId, getAnchor]) => {
    const anchor = getAnchor();
    if (!anchor) {
      finishMeasurement();
      return;
    }
    anchor.measureInWindow((x, y, width, height) => {
      if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
        matches.push({ menuId, area: width * height });
      }
      finishMeasurement();
    });
  });
}

export function useActiveRowContextMenuId(): string | null {
  return useSyncExternalStore(subscribeToMenu, getActiveMenuId, getActiveMenuId);
}

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
  menuId?: string;
};

export function RowContextMenu({
  accessibilityLabel,
  menuAccessibilityLabel,
  items,
  menuId: providedMenuId,
}: RowContextMenuProps) {
  const styles = useThemedStyles(createStyles);
  const generatedMenuId = useId();
  const menuId = providedMenuId ?? generatedMenuId;
  const openMenuId = useActiveRowContextMenuId();
  const visible = openMenuId === menuId;
  const anchorRef = useRef<View>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [modalMounted, setModalMounted] = useState(false);
  const modalMountedRef = useRef(false);
  const [animation] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    animation.stopAnimation();
    if (visible) {
      if (!modalMounted) {
        modalMountedRef.current = true;
        setModalMounted(true);
        animation.setValue(0);
        return () => animation.stopAnimation();
      }

      animation.setValue(0);
      Animated.timing(animation, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (modalMountedRef.current && openMenuId !== null && openMenuId !== menuId) {
      modalMountedRef.current = false;
      setModalMounted(false);
      animation.setValue(0);
      return;
    }

    if (modalMountedRef.current) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          modalMountedRef.current = false;
          setModalMounted(false);
        }
      });
    }
    return () => animation.stopAnimation();
  }, [animation, menuId, modalMounted, openMenuId, visible]);

  useEffect(() => {
    menuAnchors.set(menuId, () => anchorRef.current);
    return () => {
      menuAnchors.delete(menuId);
      if (getActiveMenuId() === menuId) closeRowContextMenu();
    };
  }, [menuId]);

  useEffect(() => {
    if (!visible) return;

    const menuHeight = Math.min(items.length * 48 + spacing.md, windowHeight);
    const safeRight = insets.right + spacing.sm;
    setPosition({ top: insets.top + spacing.sm, right: safeRight });
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const safeTop = insets.top + spacing.sm;
      const safeBottom = windowHeight - insets.bottom - spacing.sm;
      const below = y + height * 0.7;
      const top =
        below + menuHeight <= safeBottom ? below : Math.max(safeTop, y - menuHeight - spacing.xs);
      setPosition({
        top,
        right: Math.max(safeRight, windowWidth - x - width),
      });
    });
  }, [
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
    items.length,
    visible,
    windowHeight,
    windowWidth,
  ]);

  const animatedStyle = {
    opacity: animation,
    transform: [
      { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
    ],
  };

  return (
    <>
      <View
        ref={anchorRef}
        collapsable={false}
        style={[styles.anchor, visible ? styles.anchorOpen : null]}
      >
        <IconButton
          name="moreVertical"
          accessibilityLabel={accessibilityLabel}
          onPress={() => toggleRowContextMenu(menuId)}
        />
      </View>
      {modalMounted ? (
        <Modal
          testID="row-context-menu-modal"
          transparent
          visible
          animationType="none"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={closeRowContextMenu}
        >
          <Pressable
            accessibilityRole={visible ? 'button' : undefined}
            accessibilityLabel={visible ? `Dismiss ${menuAccessibilityLabel}` : undefined}
            accessible={visible}
            pointerEvents={visible ? 'auto' : 'none'}
            onPress={(event) => {
              event?.stopPropagation?.();
              const { pageX, pageY } = event?.nativeEvent ?? {};
              if (Number.isFinite(pageX) && Number.isFinite(pageY)) {
                openMenuAtPoint(pageX, pageY);
              } else {
                closeRowContextMenu();
              }
            }}
            style={styles.dismissBackdrop}
          />
          <Animated.View
            accessibilityLabel={visible ? menuAccessibilityLabel : undefined}
            accessibilityElementsHidden={!visible}
            importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
              styles.menu,
              position,
              { maxWidth: windowWidth - insets.left - insets.right - spacing.lg },
              animatedStyle,
            ]}
          >
            <ScrollView bounces={false} style={styles.menuItems}>
              {items.map((item) => {
                const danger = item.tone === 'danger';
                return (
                  <Pressable
                    key={item.accessibilityLabel}
                    accessibilityRole="menuitem"
                    accessibilityLabel={item.accessibilityLabel}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      closeRowContextMenu();
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
                    <Text
                      numberOfLines={1}
                      style={[styles.menuText, danger ? styles.deleteText : null]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Modal>
      ) : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    anchor: { position: 'relative' },
    anchorOpen: { zIndex: 13, elevation: 13 },
    dismissBackdrop: { ...StyleSheet.absoluteFill },
    menu: {
      position: 'absolute',
      alignSelf: 'flex-start',
      minWidth: 112,
      maxHeight: 320,
      padding: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      zIndex: 1,
      elevation: 1,
    },
    menuItems: { flexGrow: 0, flexShrink: 1 },
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
    menuText: { ...typography.label, color: theme.colors.text, flexShrink: 1 },
    deleteText: { color: theme.colors.dangerText },
    pressed: { backgroundColor: theme.colors.surfaceMuted },
  });
