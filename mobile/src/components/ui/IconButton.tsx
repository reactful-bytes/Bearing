import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import type { AppIconName } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppIcon } from './AppIcon';

type IconButtonProps = {
  name: AppIconName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconButton({
  name,
  accessibilityLabel,
  onPress,
  disabled = false,
  color,
  size = 20,
  style,
  testID,
}: IconButtonProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && !disabled ? styles.pressed : null, disabled ? styles.disabled : null, style]}
      testID={testID}
    >
      <AppIcon name={name} size={size} color={color} decorative />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      width: theme.layout.minimumTouchTarget,
      height: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.lg,
    },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.45 },
  });
