import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import type { AppIconName } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppIcon } from './AppIcon';

type IconButtonProps = {
  name: AppIconName;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconButton({
  name,
  accessibilityLabel,
  onPress,
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
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null, style]}
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
  });
