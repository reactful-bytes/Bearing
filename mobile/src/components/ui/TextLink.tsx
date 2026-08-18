import { Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';

type TextLinkProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  textStyle?: StyleProp<TextStyle>;
};

export function TextLink({ label, disabled = false, textStyle, ...pressableProps }: TextLinkProps) {
  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="link"
      accessibilityLabel={pressableProps.accessibilityLabel ?? label}
      accessibilityState={{ ...pressableProps.accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressable,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
    color: colors.brand,
  },
});
