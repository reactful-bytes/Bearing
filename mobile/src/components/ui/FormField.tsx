import { useId } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';

type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  helperStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
};

export function FormField({
  label,
  helperText,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  helperStyle,
  errorStyle,
  multiline = false,
  accessibilityLabel,
  accessibilityHint,
  ...inputProps
}: FormFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const message = error || helperText;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text nativeID={labelId} style={[styles.label, labelStyle]}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityLabelledBy={accessibilityLabel ? undefined : labelId}
        accessibilityHint={accessibilityHint ?? message}
        aria-describedby={message ? messageId : undefined}
        multiline={multiline}
        textAlignVertical={multiline ? (inputProps.textAlignVertical ?? 'top') : undefined}
        style={[styles.input, multiline ? styles.multiline : null, inputStyle]}
      />
      {message ? (
        <Text
          nativeID={messageId}
          accessibilityRole={error ? 'alert' : undefined}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={error ? [styles.error, errorStyle] : [styles.helper, helperStyle]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  multiline: {
    minHeight: 120,
  },
  helper: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  error: {
    ...typography.helper,
    color: colors.dangerText,
  },
});
