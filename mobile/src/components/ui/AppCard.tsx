import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import {} from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type AppCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function AppCard({ children, style }: AppCardProps) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.componentTokens.card.borderRadius,
      backgroundColor: theme.componentTokens.card.backgroundColor,
      padding: theme.componentTokens.card.padding,
    },
  });
