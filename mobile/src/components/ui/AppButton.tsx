import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger';

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
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {loading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerText,
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
    color: colors.surface,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  dangerText: {
    color: colors.dangerText,
  },
});
