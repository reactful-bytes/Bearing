import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';

type GoogleAuthButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function GoogleAuthButton({
  disabled = false,
  loading = false,
  onPress,
}: GoogleAuthButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <View accessibilityElementsHidden style={styles.mark}>
        <Text style={styles.markText}>G</Text>
      </View>
      <Text style={styles.label}>{loading ? 'Connecting...' : 'Continue with Google'}</Text>
      <View style={styles.balance} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  markText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  label: {
    ...typography.button,
    flex: 1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  balance: {
    width: 24,
  },
});
