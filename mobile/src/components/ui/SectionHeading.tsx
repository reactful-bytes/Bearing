import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type SectionHeadingProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
};

export function SectionHeading({ title, description, trailing }: SectionHeadingProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    title: {
      ...typography.button,
      fontSize: 18,
      color: theme.colors.text,
    },
    description: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    trailing: {
      flexShrink: 1,
    },
  });
