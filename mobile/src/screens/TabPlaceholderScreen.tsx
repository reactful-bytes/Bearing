import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { layout, spacing } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { AppCard } from '../components/ui/AppCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';

type TabPlaceholderScreenProps = {
  title: string;
  description: string;
  routeId: string;
  children?: ReactNode;
};

export function TabPlaceholderScreen({
  title,
  description,
  routeId,
  children,
}: TabPlaceholderScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xl + insets.bottom }]}
    >
      <ScreenHeader eyebrow="Tab placeholder" title={title} description={description} />

      <AppCard>
        <Text style={styles.metaLabel}>Route ID</Text>
        <Text style={styles.metaValue}>{routeId}</Text>
      </AppCard>

      {children ? <View style={styles.actionBlock}>{children}</View> : null}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: layout.pagePaddingHorizontal,
      paddingVertical: layout.pagePaddingVertical,
      gap: spacing.xl,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: theme.colors.brand,
      fontSize: 16,
      fontWeight: '600',
    },
    actionBlock: {
      gap: spacing.md,
    },
  });
