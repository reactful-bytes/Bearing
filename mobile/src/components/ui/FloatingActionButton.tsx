import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { AppIcon } from './AppIcon';
import type { AppIconName } from '../../design/icons';
import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

const iconSizes = {
  standard: 24,
  small: 20,
  large: 28,
} as const;

type FloatingActionButtonProps = {
  label?: string;
  accessibilityLabel?: string;
  showIcon?: boolean;
  icon?: AppIconName;
  size?: 'standard' | 'small' | 'large';
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelColor?: string;
};

export function FloatingActionButton({
  label,
  accessibilityLabel,
  showIcon = false,
  icon,
  size = 'standard',
  onPress,
  disabled = false,
  style,
  labelColor,
}: FloatingActionButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const iconOnly = Boolean(icon && !label);
  const iconOnlyStyle =
    size === 'small'
      ? styles.iconOnlySmall
      : size === 'large'
        ? styles.iconOnlyLarge
        : styles.iconOnlyStandard;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? 'Floating action button'}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        iconOnly ? iconOnlyStyle : null,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {icon ? (
        <AppIcon
          decorative
          name={icon}
          size={iconSizes[size]}
          color={theme.componentTokens.button.textColor}
        />
      ) : null}
      {!icon && showIcon ? <Text style={styles.icon}>+</Text> : null}
      {label ? (
        <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      minHeight: 52,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
      backgroundColor: theme.componentTokens.button.backgroundColor,
    },
    standard: {},
    small: {
      minHeight: theme.layout.minimumTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    large: {
      minHeight: 60,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
    },
    iconOnlyStandard: {
      width: 52,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: 26,
      justifyContent: 'center',
    },
    iconOnlySmall: {
      width: theme.layout.minimumTouchTarget,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: theme.layout.minimumTouchTarget / 2,
      justifyContent: 'center',
    },
    iconOnlyLarge: {
      width: 60,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: 30,
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.86,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    icon: {
      ...typography.button,
      color: theme.componentTokens.button.textColor,
      lineHeight: 18,
    },
    label: {
      ...typography.button,
      color: theme.componentTokens.button.textColor,
    },
  });
