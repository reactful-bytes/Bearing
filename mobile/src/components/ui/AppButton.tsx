import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'brandOutline';

type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: ReactNode;
  variant?: AppButtonVariant;
  loading?: boolean;
  loadingLabel?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  loadingLabel = 'Loading...',
  disabled = false,
  accessibilityLabel,
  accessibilityState,
  style,
  textStyle,
  ...pressableProps
}: AppButtonProps) {
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator testID="app-button-loading" color={styles[`${variant}Text`].color} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 44,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.colors.brand,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    danger: {
      backgroundColor: theme.colors.dangerSurface,
      borderWidth: 1,
      borderColor: theme.colors.dangerText,
    },
    brandOutline: {
      backgroundColor: theme.colors.surfaceBrand,
      borderWidth: 1,
      borderColor: theme.colors.brand,
    },
    pressed: {
      opacity: 0.86,
    },
    disabled: {
      opacity: 0.6,
    },
    text: {
      ...typography.button,
      textAlign: 'center',
    },
    primaryText: {
      color: theme.colors.onBrand,
    },
    secondaryText: {
      color: theme.colors.textPrimary,
    },
    dangerText: {
      color: theme.colors.dangerText,
    },
    brandOutlineText: {
      color: theme.colors.brand,
    },
  });
