import { MaterialIcons } from '@expo/vector-icons';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

import { AppIconName, icons } from '../../design/icons';
import { useTheme } from '../../design/ThemeProvider';

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  testID?: string;
};

export function AppIcon({
  name,
  size = 24,
  color,
  accessibilityLabel,
  decorative = !accessibilityLabel,
  style,
  imageStyle,
  testID,
}: AppIconProps) {
  const { theme } = useTheme();
  const icon = icons[name];
  const accessibilityProps = decorative
    ? { accessible: false }
    : { accessibilityRole: 'image' as const, accessibilityLabel: accessibilityLabel ?? name };
  const containerStyle = [{ width: size, height: size }, style];

  if (icon.kind === 'image') {
    return (
      <View testID={testID} style={containerStyle} {...accessibilityProps}>
        <Image
          source={icon.source}
          style={[
            { width: size, height: size },
            icon.tintable ? { tintColor: color ?? theme.colors.textPrimary } : null,
            imageStyle,
          ]}
        />
      </View>
    );
  }

  return (
    <View testID={testID} style={containerStyle} {...accessibilityProps}>
      <MaterialIcons name={icon.name} size={size} color={color ?? theme.colors.textPrimary} />
    </View>
  );
}
