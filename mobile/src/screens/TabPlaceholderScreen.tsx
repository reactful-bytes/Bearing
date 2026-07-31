import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing } from '../design/tokens';
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
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader eyebrow="Tab placeholder" title={title} description={description} />

      <AppCard>
        <Text style={styles.metaLabel}>Route ID</Text>
        <Text style={styles.metaValue}>{routeId}</Text>
      </AppCard>

      {children ? <View style={styles.actionBlock}>{children}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.pagePaddingHorizontal,
    paddingVertical: layout.pagePaddingVertical,
    gap: spacing.xl,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '600',
  },
  actionBlock: {
    gap: spacing.md,
  },
});
