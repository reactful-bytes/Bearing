import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

import { AppIconDefinition, AppIconName, icons } from '../../design/icons';
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
  const { preference, theme } = useTheme();
  const icon: AppIconDefinition = icons[name];
  const accessibilityProps = decorative
    ? { accessible: false }
    : { accessibilityRole: 'image' as const, accessibilityLabel: accessibilityLabel ?? name };
  const containerStyle = [{ width: size, height: size }, style];

  if (icon.kind === 'image') {
    const source = icon.themeSources?.[preference] ?? icon.source;

    return (
      <View testID={testID} style={containerStyle} {...accessibilityProps}>
        <Image
          source={source}
          resizeMode="contain"
          style={[
            { width: size, height: size },
            icon.tintable ? { tintColor: color ?? theme.colors.textPrimary } : null,
            imageStyle,
          ]}
        />
      </View>
    );
  }

  const iconColor = color ?? theme.colors.textPrimary;
  const IconComponent = icon.component;

  return (
    <View testID={testID} style={containerStyle} {...accessibilityProps}>
      <IconComponent size={size} color={iconColor} strokeWidth={2} />
    </View>
  );
}
