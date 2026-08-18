import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';

export function AuthDivider() {
  return (
    <View accessibilityRole="none" style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>or continue with email</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  label: {
    ...typography.helper,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
