import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { componentTokens, radii, spacing, typography } from '../../design/tokens';

type FloatingActionButtonProps = {
  label?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelColor?: string;
};

export function FloatingActionButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  style,
  labelColor,
}: FloatingActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? 'Floating action button'}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      <Text style={styles.icon}>+</Text>
      {label ? (
        <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: componentTokens.button.backgroundColor,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    ...typography.button,
    color: componentTokens.button.textColor,
    lineHeight: 18,
  },
  label: {
    ...typography.button,
    color: componentTokens.button.textColor,
  },
});
