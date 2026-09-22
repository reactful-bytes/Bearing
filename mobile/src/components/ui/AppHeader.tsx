import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  centeredTitle?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AppHeader({
  title,
  eyebrow,
  subtitle,
  leading,
  trailing,
  centeredTitle = false,
  titleStyle,
  style,
  testID,
}: AppHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const showActionSlots = centeredTitle || Boolean(leading || trailing);
  const copy = (
    <View style={[styles.copy, centeredTitle && styles.centeredCopy]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, titleStyle]}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text numberOfLines={2} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      testID={testID}
      style={[styles.container, centeredTitle && styles.centeredContainer, style]}
    >
      {showActionSlots ? (
        <View testID={testID ? `${testID}-leading` : undefined} style={styles.actionSlot}>
          {leading}
        </View>
      ) : null}
      {centeredTitle ? <View style={styles.centeredCopyContainer}>{copy}</View> : copy}
      {showActionSlots ? (
        <View testID={testID ? `${testID}-trailing` : undefined} style={styles.actionSlot}>
          {trailing}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    centeredContainer: {
      gap: theme.spacing.md,
    },
    actionSlot: {
      width: theme.layout.minimumTouchTarget,
      height: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs,
    },
    centeredCopyContainer: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
    centeredCopy: {
      alignItems: 'center',
    },
    eyebrow: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    title: {
      ...theme.typography.screenTitle,
      color: theme.colors.text,
      flexShrink: 1,
    },
    subtitle: {
      ...theme.typography.helper,
      color: theme.colors.textSecondary,
    },
  });
