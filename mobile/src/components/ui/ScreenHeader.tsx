import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppHeader } from './AppHeader';
import { IconButton } from './IconButton';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

type ScreenHeaderProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPressBack?: () => void;
  backAccessibilityLabel?: string;
};

export function ScreenHeader({
  title = '',
  description,
  eyebrow,
  trailing,
  style,
  onPressBack,
  backAccessibilityLabel = 'Go back',
}: ScreenHeaderProps) {
  const styles = useThemedStyles(createStyles);

  if (onPressBack) {
    return (
      <View style={[styles.scrollHeader, style]}>
        <IconButton name="back" accessibilityLabel={backAccessibilityLabel} onPress={onPressBack} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <View style={styles.placeholder} />
      </View>
    );
  }

  return (
    <AppHeader
      title={title}
      eyebrow={eyebrow}
      subtitle={description}
      trailing={trailing}
      style={style}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    title: {
      ...theme.typography.label,
      color: theme.colors.brand,
      textAlign: 'center',
      flex: 1,
    },
    placeholder: {
      width: 44,
      height: 44,
    },
  });
