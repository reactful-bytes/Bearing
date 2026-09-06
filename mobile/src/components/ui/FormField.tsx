import { useId } from 'react';
import {
  StyleProp,
  StyleSheet,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { AppIcon } from './AppIcon';
import type { AppIconName } from '../../design/icons';
import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  helperStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  trailingIcon?: AppIconName;
  trailingIconLabel?: string;
  onPressTrailingIcon?: () => void;
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
  trailingIcon,
  trailingIconLabel,
  onPressTrailingIcon,
  multiline = false,
  accessibilityLabel,
  accessibilityHint,
  ...inputProps
}: FormFieldProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const id = useId();
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const message = error || helperText;
  const input = (
    <TextInput
      {...inputProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabel ? undefined : labelId}
      accessibilityHint={accessibilityHint ?? message}
      aria-describedby={message ? messageId : undefined}
      multiline={multiline}
      textAlignVertical={multiline ? (inputProps.textAlignVertical ?? 'top') : undefined}
      style={[
        styles.input,
        multiline ? styles.multiline : null,
        trailingIcon ? styles.inputWithTrailing : null,
        inputStyle,
      ]}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <Text nativeID={labelId} style={[styles.label, labelStyle]}>
        {label}
      </Text>
      {trailingIcon ? (
        <View style={[styles.inputRow, multiline && styles.multilineRow]}>
          {input}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingIconLabel ?? `${label} action`}
            accessibilityState={{ disabled: !onPressTrailingIcon }}
            onPress={onPressTrailingIcon}
            disabled={!onPressTrailingIcon}
            style={styles.trailingIcon}
          >
            <AppIcon decorative name={trailingIcon} size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      ) : (
        input
      )}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    multiline: {
      minHeight: 120,
    },
    inputRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
    },
    multilineRow: {
      alignItems: 'flex-start',
    },
    inputWithTrailing: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      borderWidth: 0,
    },
    trailingIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.textSecondary,
    },
    helper: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    error: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
  });
