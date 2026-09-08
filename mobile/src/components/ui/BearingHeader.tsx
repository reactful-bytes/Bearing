import { StyleSheet, View } from 'react-native';

import type { AppIconName } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

type BearingHeaderProps = {
  leadingAccessibilityLabel: string;
  onPressLeading?: () => void;
  trailingAccessibilityLabel: string;
  trailingName?: AppIconName;
  onPressTrailing?: () => void;
};

export function BearingHeader({
  leadingAccessibilityLabel,
  onPressLeading,
  trailingAccessibilityLabel,
  trailingName = 'more',
  onPressTrailing,
}: BearingHeaderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <IconButton
        name="menu"
        accessibilityLabel={leadingAccessibilityLabel}
        onPress={onPressLeading ?? (() => undefined)}
        style={styles.action}
      />
      <View style={styles.mark}>
        <AppIcon name="bearingMark" size={34} decorative />
      </View>
      <IconButton
        name={trailingName}
        accessibilityLabel={trailingAccessibilityLabel}
        onPress={onPressTrailing ?? (() => undefined)}
        style={styles.action}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    action: {
      marginHorizontal: -theme.spacing.xs,
    },
    mark: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
