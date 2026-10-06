import { Pressable, StyleSheet, Text } from 'react-native';

import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

type ModalHeaderActionProps = {
  accessibilityLabel: string;
  onPress: () => void;
  label?: string;
};

export function ModalHeaderAction({
  accessibilityLabel,
  onPress,
  label = 'Apply',
}: ModalHeaderActionProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      minWidth: 48,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    label: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    pressed: { opacity: 0.72 },
  });