import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { PremiumFeature, getPremiumPaywallCopy } from '../../features/premium/premiumAccess';

type PremiumPaywallModalProps = {
  visible: boolean;
  feature: PremiumFeature | null;
  isAnonymous: boolean;
  onClose: () => void;
};

export function PremiumPaywallModal({
  visible,
  feature,
  isAnonymous,
  onClose,
}: PremiumPaywallModalProps) {
  if (!visible || !feature) {
    return null;
  }

  const copy = getPremiumPaywallCopy(feature);

  return (
    <AppModal visible={visible} title="Bearing Premium" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBlock}>
          <Text style={styles.badge}>{copy.badge}</Text>
          <Text style={styles.headline}>{copy.headline}</Text>
          <Text style={styles.body}>{copy.body}</Text>
        </View>

        <AppCard style={styles.highlightsCard}>
          <Text style={styles.sectionTitle}>Included with Premium</Text>
          <View style={styles.highlightList}>
            {copy.highlights.map((highlight) => (
              <View key={highlight} style={styles.highlightRow}>
                <View style={styles.highlightDot} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        </AppCard>

        <View style={styles.planColumn}>
          <AppCard style={styles.planCard}>
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planSummary}>Flexible access for short goal-planning sprints.</Text>
            <Text style={styles.planMeta}>Store pricing loads here after App Store and Google Play billing are connected.</Text>
          </AppCard>

          <AppCard style={styles.planCard}>
            <Text style={styles.planName}>Annual</Text>
            <Text style={styles.planSummary}>Best fit for longer goal cycles and ongoing calendar sync.</Text>
            <Text style={styles.planMeta}>Plan pricing and intro offers will load from the stores in the monetization milestone.</Text>
          </AppCard>
        </View>

        <Text style={styles.footnote}>
          This is the in-app paywall shell. Store checkout, restore, and live entitlement wiring land in the subscription setup slice.
        </Text>

        {isAnonymous ? (
          <Text style={styles.accountNote}>
            Secure this anonymous session before live purchases ship so premium access can attach to a permanent account.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close premium paywall"
          onPress={onClose}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.primaryButtonText}>Continue on Free Plan</Text>
        </Pressable>
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  heroBlock: {
    gap: spacing.sm,
  },
  badge: {
    ...typography.label,
    color: colors.brand,
  },
  headline: {
    ...typography.screenTitle,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  highlightsCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.button,
    color: colors.text,
  },
  highlightList: {
    gap: spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginTop: 8,
  },
  highlightText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  planColumn: {
    gap: spacing.md,
  },
  planCard: {
    gap: spacing.xs,
  },
  planName: {
    ...typography.button,
    color: colors.text,
  },
  planSummary: {
    ...typography.body,
    color: colors.textPrimary,
  },
  planMeta: {
    ...typography.helper,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footnote: {
    ...typography.helper,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  accountNote: {
    ...typography.helper,
    color: colors.brand,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.background,
  },
  buttonPressed: {
    opacity: 0.9,
  },
});