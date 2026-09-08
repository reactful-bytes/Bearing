import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type CardVariant = 'standard' | 'elevated' | 'outlined';

export type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: ViewProps['accessibilityRole'];
  accessibilityState?: ViewProps['accessibilityState'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  variant = 'standard',
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  style,
  testID,
}: CardProps) {
  const styles = useThemedStyles(createStyles);
  const cardStyle = [styles.card, styles[variant], onPress ? styles.pressableCard : null, style];

  if (!onPress) {
    return (
      <View testID={testID} style={cardStyle}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        cardStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.componentTokens.card.borderRadius,
      padding: theme.componentTokens.card.padding,
    },
    standard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    elevated: {
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pressableCard: {
      minHeight: theme.layout.minimumTouchTarget,
    },
    pressed: {
      opacity: 0.86,
    },
    disabled: {
      opacity: 0.55,
    },
  });
