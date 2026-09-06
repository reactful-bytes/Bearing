import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

export function AuthDivider() {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityRole="none" style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>or continue with email</Text>
      <View style={styles.line} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    label: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
