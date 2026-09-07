import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type GoogleAuthButtonProps = {
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function GoogleAuthButton({
  label = 'Continue with Google',
  disabled = false,
  loading = false,
  onPress,
}: GoogleAuthButtonProps) {
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <View accessibilityElementsHidden style={styles.iconFrame}>
        <Svg width={24} height={24} viewBox="0 0 48 48" style={styles.icon}>
          <Path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <Path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <Path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <Path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <Path fill="none" d="M0 0h48v48H0z" />
        </Svg>
      </View>
      <Text style={styles.label}>{loading ? 'Connecting...' : label}</Text>
      <View accessibilityElementsHidden style={styles.balance} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.surface,
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
    label: {
      ...typography.button,
      flex: 1,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    iconFrame: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      width: 24,
      height: 24,
      resizeMode: 'contain',
    },
    balance: {
      width: 32,
    },
  });
