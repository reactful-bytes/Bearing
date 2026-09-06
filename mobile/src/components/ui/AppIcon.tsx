import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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
  const { theme } = useTheme();
  const icon: AppIconDefinition = icons[name];
  const accessibilityProps = decorative
    ? { accessible: false }
    : { accessibilityRole: 'image' as const, accessibilityLabel: accessibilityLabel ?? name };
  const containerStyle = [{ width: size, height: size }, style];

  if (icon.kind === 'image') {
    return (
      <View testID={testID} style={containerStyle} {...accessibilityProps}>
        <Image
          source={icon.source}
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
  return (
    <View testID={testID} style={containerStyle} {...accessibilityProps}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {icon.rects?.map((rect, index) => (
          <Rect key={`rect-${index}`} {...rect} stroke={iconColor} strokeWidth={1.8} />
        ))}
        {icon.circles?.map((circle, index) => (
          <Circle key={`circle-${index}`} {...circle} stroke={iconColor} strokeWidth={1.8} />
        ))}
        {icon.paths.map((path, index) => (
          <Path
            key={`path-${index}`}
            {...path}
            stroke={iconColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}
