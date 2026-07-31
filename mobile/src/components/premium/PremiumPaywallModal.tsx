import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { PremiumFeature, getPremiumPaywallCopy } from '../../features/premium/premiumAccess';
import { usePremiumPurchase } from '../../features/premium/usePremiumPurchase';
import { recordTelemetryEvent } from '../../services/telemetry/telemetry';
import { LEGAL_DOCUMENTS, LegalDocumentId } from '../../features/profile/legalDocuments';
import { LegalDocumentModal } from '../profile/LegalDocumentModal';

type PremiumPaywallModalProps = {
  visible: boolean;
  feature: PremiumFeature | null;
  userId: string | null;
  isAnonymous: boolean;
  hasPremiumAccess: boolean;
  onClose: () => void;
};

export function PremiumPaywallModal({
  visible,
  feature,
  userId,
  isAnonymous,
  hasPremiumAccess,
  onClose,
}: PremiumPaywallModalProps) {
  const [legalDocumentId, setLegalDocumentId] = useState<LegalDocumentId | null>(null);
  const purchase = usePremiumPurchase(userId, !isAnonymous, visible, hasPremiumAccess);
  useEffect(() => {
    if (visible && feature) {
      void recordTelemetryEvent('premium_paywall_viewed', { feature });
    }
  }, [feature, visible]);

  if (!visible || !feature) {
    return null;
  }

  const copy = getPremiumPaywallCopy(feature);

  return (
    <>
      <AppModal
        visible={visible && legalDocumentId === null}
        title="Bearing Premium"
        onClose={onClose}
      >
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

          {purchase.loading ? <Text style={styles.planMeta}>Loading store plans...</Text> : null}

          <View style={styles.planColumn}>
            {purchase.plans.map((plan) => (
              <AppCard key={plan.packageIdentifier} style={styles.planCard}>
                <Text style={styles.planName}>{plan.title}</Text>
                <Text style={styles.planPrice}>
                  {plan.priceText} {plan.billingPeriodText}
                </Text>
                {plan.introductoryTermsText ? (
                  <Text style={styles.planMeta}>{plan.introductoryTermsText}</Text>
                ) : null}
                <AppButton
                  label={`Choose ${plan.title}`}
                  accessibilityLabel={`Purchase ${plan.title} Premium plan`}
                  onPress={() => void purchase.purchase(plan)}
                  loading={purchase.pendingAction === plan.packageIdentifier}
                  loadingLabel="Opening store..."
                  disabled={purchase.awaitingActivation || hasPremiumAccess}
                />
              </AppCard>
            ))}
          </View>

          {purchase.availability !== 'available' && !isAnonymous ? (
            <Text style={styles.accountNote}>
              {purchase.availability === 'web'
                ? 'Premium checkout is available in the iOS and Android apps.'
                : purchase.availability === 'expo_go'
                  ? 'Use an installed development build to test real store purchases.'
                  : 'Store billing is not configured in this build.'}
            </Text>
          ) : null}

          {isAnonymous ? (
            <Text style={styles.accountNote}>
              Secure this anonymous session before purchasing so Premium can be restored across
              devices.
            </Text>
          ) : null}

          {purchase.error ? <Text style={styles.errorText}>{purchase.error}</Text> : null}
          {purchase.feedback ? <Text style={styles.successText}>{purchase.feedback}</Text> : null}

          <AppButton
            label="Restore Purchases"
            variant="secondary"
            accessibilityLabel="Restore Premium purchases"
            onPress={() => void purchase.restore()}
            loading={purchase.pendingAction === 'restore'}
            loadingLabel="Restoring..."
            disabled={
              isAnonymous || purchase.availability !== 'available' || purchase.awaitingActivation
            }
          />

          <Text style={styles.footnote}>
            Subscriptions renew automatically unless canceled in Apple or Google account settings.
            Deleting Bearing does not cancel a store subscription.
          </Text>

          <View style={styles.legalActions}>
            <AppButton
              label="Privacy Policy"
              variant="secondary"
              accessibilityLabel="Open Privacy Policy"
              onPress={() => setLegalDocumentId('privacy')}
            />
            <AppButton
              label="Terms of Service"
              variant="secondary"
              accessibilityLabel="Open Terms of Service"
              onPress={() => setLegalDocumentId('terms')}
            />
          </View>

          <AppButton
            label="Continue on Free Plan"
            accessibilityLabel="Close premium paywall"
            onPress={onClose}
          />
        </ScrollView>
      </AppModal>
      <LegalDocumentModal
        document={legalDocumentId ? LEGAL_DOCUMENTS[legalDocumentId] : null}
        onClose={() => setLegalDocumentId(null)}
      />
    </>
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
  planPrice: {
    ...typography.button,
    color: colors.brand,
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
  legalActions: {
    gap: spacing.sm,
  },
  accountNote: {
    ...typography.helper,
    color: colors.brand,
    lineHeight: 20,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  successText: {
    ...typography.helper,
    color: colors.brand,
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
