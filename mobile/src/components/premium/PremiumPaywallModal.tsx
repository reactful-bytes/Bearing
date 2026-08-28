import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { PremiumFeature, getPremiumPaywallCopy } from '../../features/premium/premiumAccess';
import { usePremiumPurchase } from '../../features/premium/usePremiumPurchase';
import { PremiumPlan } from '../../features/premium/purchaseTypes';
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

function getBrandedPlanName(plan: PremiumPlan): string {
  return /\bbearing 360\b/i.test(plan.title) ? plan.title : `${plan.title} Bearing 360`;
}

export function PremiumPaywallModal({
  visible,
  feature,
  userId,
  isAnonymous,
  hasPremiumAccess,
  onClose,
}: PremiumPaywallModalProps) {
  const [legalDocumentId, setLegalDocumentId] = useState<LegalDocumentId | null>(null);
  const [selectedPackageIdentifier, setSelectedPackageIdentifier] = useState<string | null>(null);
  const [confirmationPlan, setConfirmationPlan] = useState<PremiumPlan | null>(null);
  const [transactionPlan, setTransactionPlan] = useState<PremiumPlan | null>(null);
  const purchase = usePremiumPurchase(userId, !isAnonymous, visible, hasPremiumAccess);
  useEffect(() => {
    if (visible && feature) {
      void recordTelemetryEvent('premium_paywall_viewed', { feature });
    }
  }, [feature, visible]);

  useEffect(() => {
    setSelectedPackageIdentifier((currentIdentifier) =>
      purchase.plans.some((plan) => plan.packageIdentifier === currentIdentifier)
        ? currentIdentifier
        : (purchase.plans[0]?.packageIdentifier ?? null),
    );
  }, [purchase.plans]);

  if (!visible || !feature) {
    return null;
  }

  const copy = getPremiumPaywallCopy(feature);
  const hasAutoRenewingPlans = purchase.plans.some((plan) => plan.isAutoRenewing);
  const hasOneTimePurchasePlans = purchase.plans.some((plan) => plan.isOneTimePurchase);
  const selectedPlan =
    purchase.plans.find((plan) => plan.packageIdentifier === selectedPackageIdentifier) ?? null;
  const isPurchaseDisabled =
    !selectedPlan ||
    isAnonymous ||
    hasPremiumAccess ||
    purchase.availability !== 'available' ||
    purchase.awaitingActivation ||
    purchase.pendingAction !== null;

  async function confirmPurchase(): Promise<void> {
    if (!confirmationPlan) return;
    setTransactionPlan(confirmationPlan);
    setConfirmationPlan(null);
    await purchase.purchase(confirmationPlan);
  }

  const isPurchaseInProgress =
    transactionPlan !== null &&
    (purchase.pendingAction === transactionPlan.packageIdentifier || purchase.awaitingActivation);
  const isPurchaseComplete =
    transactionPlan !== null && (purchase.feedback !== null || purchase.error !== null);

  return (
    <>
      <AppModal
        visible={
          visible &&
          legalDocumentId === null &&
          confirmationPlan === null &&
          transactionPlan === null
        }
        title="Bearing 360"
        onClose={onClose}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <>
            <View style={styles.heroBlock}>
              <Text style={styles.badge}>{copy.badge}</Text>
              <Text style={styles.headline}>{copy.headline}</Text>
              <Text style={styles.body}>{copy.body}</Text>
            </View>

            <AppCard style={styles.highlightsCard}>
              <Text style={styles.sectionTitle}>Included with Bearing 360</Text>
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
              {purchase.plans.map((plan) => {
                const isSelected = plan.packageIdentifier === selectedPackageIdentifier;
                return (
                  <Pressable
                    key={plan.packageIdentifier}
                    accessibilityRole="radio"
                    accessibilityLabel={`Select ${getBrandedPlanName(plan)} plan`}
                    accessibilityState={{
                      selected: isSelected,
                      disabled: purchase.pendingAction !== null,
                    }}
                    disabled={purchase.pendingAction !== null}
                    onPress={() => setSelectedPackageIdentifier(plan.packageIdentifier)}
                    style={({ pressed }) => [
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      pressed && purchase.pendingAction === null && styles.planCardPressed,
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.planDetails}>
                        <View style={styles.planTitleRow}>
                          <View
                            style={[
                              styles.selectionIndicator,
                              isSelected && styles.selectionIndicatorSelected,
                            ]}
                          >
                            {isSelected ? <View style={styles.selectionIndicatorFill} /> : null}
                          </View>
                          <Text style={styles.planName}>{plan.title}</Text>
                        </View>
                        {plan.annualMonthlyBreakdownText ? (
                          <Text style={styles.planSummary}>{plan.annualMonthlyBreakdownText}</Text>
                        ) : null}
                        {plan.introductoryOfferText ? (
                          <View style={styles.planOfferBadge}>
                            <Text style={styles.planIntroductoryOffer}>
                              {plan.introductoryOfferText}
                            </Text>
                          </View>
                        ) : null}
                        {plan.creditAmount !== null ? (
                          <Text style={styles.planMeta}>
                            Includes {plan.creditAmount} AI planning{' '}
                            {plan.creditAmount === 1 ? 'credit' : 'credits'} per grant
                          </Text>
                        ) : null}
                        {plan.trialCreditAmount !== null ? (
                          <Text style={styles.planMeta}>
                            Trial includes {plan.trialCreditAmount} AI planning{' '}
                            {plan.trialCreditAmount === 1 ? 'credit' : 'credits'}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.planPriceBlock}>
                        <Text style={styles.planPrice}>
                          {plan.priceText}
                          {plan.priceSuffixText}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <AppButton
              label="Continue"
              accessibilityLabel={
                selectedPlan
                  ? `Continue with ${getBrandedPlanName(selectedPlan)} plan`
                  : 'Select a plan'
              }
              onPress={() => selectedPlan && setConfirmationPlan(selectedPlan)}
              disabled={isPurchaseDisabled}
            />

            {purchase.availability !== 'available' && !isAnonymous ? (
              <Text style={styles.accountNote}>
                {purchase.availability === 'web'
                  ? 'Bearing 360 checkout is available in the iOS and Android apps.'
                  : purchase.availability === 'expo_go'
                    ? 'Use an installed development build to test real store purchases.'
                    : 'Store billing is not configured in this build.'}
              </Text>
            ) : null}

            {isAnonymous ? (
              <Text style={styles.accountNote}>
                Secure this anonymous session before purchasing so Bearing 360 can be restored
                across devices.
              </Text>
            ) : null}

            {purchase.error ? <Text style={styles.errorText}>{purchase.error}</Text> : null}

            <AppButton
              label="Restore Purchases"
              variant="secondary"
              accessibilityLabel="Restore Bearing 360 purchases"
              onPress={() => void purchase.restore()}
              loading={purchase.pendingAction === 'restore'}
              loadingLabel="Restoring..."
              disabled={
                isAnonymous || purchase.availability !== 'available' || purchase.awaitingActivation
              }
            />

            {hasAutoRenewingPlans || hasOneTimePurchasePlans ? (
              <Text style={styles.footnote}>
                {hasAutoRenewingPlans
                  ? 'Subscriptions renew automatically unless canceled in Apple or Google account settings. '
                  : ''}
                {hasOneTimePurchasePlans ? 'One-time purchases do not renew automatically. ' : ''}
                {hasAutoRenewingPlans
                  ? 'Deleting Bearing does not cancel a store subscription.'
                  : ''}
              </Text>
            ) : null}

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
              accessibilityLabel="Close Bearing 360 plans"
              onPress={onClose}
            />
          </>
        </ScrollView>
      </AppModal>
      <LegalDocumentModal
        document={legalDocumentId ? LEGAL_DOCUMENTS[legalDocumentId] : null}
        onClose={() => setLegalDocumentId(null)}
      />
      <AppModal
        visible={confirmationPlan !== null || transactionPlan !== null}
        title={
          transactionPlan
            ? isPurchaseInProgress
              ? 'Completing Purchase'
              : 'Bearing 360 Update'
            : 'Confirm Bearing 360'
        }
        closeLabel={transactionPlan ? 'Close' : 'Back'}
        onClose={() => {
          if (transactionPlan) {
            if (!isPurchaseInProgress) setTransactionPlan(null);
          } else if (!purchase.pendingAction) {
            setConfirmationPlan(null);
          }
        }}
      >
        {confirmationPlan ? (
          <View style={styles.confirmationContent}>
            <Text style={styles.confirmationIntro}>You are selecting</Text>
            <View style={styles.confirmationPlan}>
              <View style={styles.confirmationPlanDetails}>
                <Text style={styles.confirmationPlanTitle}>{confirmationPlan.title}</Text>
                {confirmationPlan.annualMonthlyBreakdownText ? (
                  <Text style={styles.planSummary}>
                    {confirmationPlan.annualMonthlyBreakdownText}
                  </Text>
                ) : null}
                {confirmationPlan.introductoryOfferText ? (
                  <Text style={styles.planMeta}>{confirmationPlan.introductoryOfferText}</Text>
                ) : null}
              </View>
              <Text style={styles.confirmationPlanPrice}>
                {confirmationPlan.priceText}
                {confirmationPlan.priceSuffixText}
              </Text>
            </View>
            <Text style={styles.confirmationTerms}>
              {confirmationPlan.isAutoRenewing
                ? 'Renews automatically unless you cancel in your Apple or Google account settings.'
                : confirmationPlan.isOneTimePurchase
                  ? 'This is a one-time purchase and does not renew automatically.'
                  : 'The store will show the final purchase terms before you confirm.'}
            </Text>
            <AppButton
              label="Continue to Store"
              accessibilityLabel={`Continue to the store for ${getBrandedPlanName(confirmationPlan)}`}
              onPress={() => void confirmPurchase()}
              loading={purchase.pendingAction === confirmationPlan.packageIdentifier}
              loadingLabel="Opening store..."
              disabled={purchase.pendingAction !== null || purchase.awaitingActivation}
            />
            <AppButton
              label="Choose Another Plan"
              variant="secondary"
              accessibilityLabel="Return to Bearing 360 plan selection"
              onPress={() => setConfirmationPlan(null)}
              disabled={purchase.pendingAction !== null}
            />
          </View>
        ) : null}
        {transactionPlan ? (
          <View style={styles.transactionContent}>
            <View style={styles.transactionPlan}>
              <Text style={styles.transactionPlanLabel}>Selected plan</Text>
              <View style={styles.transactionPlanRow}>
                <Text style={styles.transactionPlanTitle}>{transactionPlan.title}</Text>
                <Text style={styles.transactionPlanPrice}>
                  {transactionPlan.priceText}
                  {transactionPlan.priceSuffixText}
                </Text>
              </View>
            </View>
            {isPurchaseInProgress ? (
              <View style={styles.purchaseState}>
                <View style={styles.progressIndicator}>
                  <ActivityIndicator
                    accessibilityLabel="Activating Bearing 360 purchase"
                    color={colors.brand}
                    size="large"
                  />
                </View>
                <Text style={styles.purchaseStateTitle}>
                  {purchase.awaitingActivation ? 'Activating Bearing 360' : 'Confirming purchase'}
                </Text>
                <Text style={styles.purchaseStateDescription}>
                  {purchase.awaitingActivation
                    ? 'Confirming your purchase with Bearing. This can take a moment.'
                    : `Opening the store for ${transactionPlan.title}.`}
                </Text>
              </View>
            ) : isPurchaseComplete ? (
              <View style={styles.purchaseState}>
                <View
                  style={[
                    styles.resultMark,
                    purchase.error ? styles.resultMarkFailure : styles.resultMarkSuccess,
                  ]}
                >
                  <Text style={styles.resultMarkText}>{purchase.error ? '!' : '✓'}</Text>
                </View>
                <Text style={styles.purchaseStateTitle}>
                  {purchase.error
                    ? 'Purchase not completed'
                    : hasPremiumAccess
                      ? `${getBrandedPlanName(transactionPlan)} is active`
                      : 'Bearing 360 activation is still syncing'}
                </Text>
                <Text style={styles.purchaseStateDescription}>
                  {purchase.error ?? purchase.feedback}
                </Text>
                <AppButton
                  label={purchase.error ? 'Choose Another Plan' : 'Done'}
                  accessibilityLabel={
                    purchase.error ? 'Choose another Bearing 360 plan' : 'Close Bearing 360'
                  }
                  onPress={() => {
                    if (purchase.error) {
                      setTransactionPlan(null);
                    } else {
                      onClose();
                    }
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
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
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  planCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceBrand,
  },
  planCardPressed: {
    opacity: 0.88,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectionIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorSelected: {
    borderColor: colors.brand,
  },
  selectionIndicatorFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  planDetails: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  planPriceBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
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
    textAlign: 'right',
  },
  planIntroductoryOffer: {
    ...typography.helper,
    color: colors.brand,
  },
  planOfferBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  purchaseState: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  transactionContent: {
    gap: spacing.md,
  },
  transactionPlan: {
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  transactionPlanLabel: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  transactionPlanRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  transactionPlanTitle: {
    ...typography.button,
    color: colors.text,
    flex: 1,
  },
  transactionPlanPrice: {
    ...typography.button,
    color: colors.brand,
  },
  progressIndicator: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBrand,
  },
  resultMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMarkSuccess: {
    backgroundColor: colors.surfaceBrand,
  },
  resultMarkFailure: {
    backgroundColor: colors.surfaceMuted,
  },
  resultMarkText: {
    ...typography.title,
    color: colors.brand,
  },
  purchaseStateTitle: {
    ...typography.button,
    color: colors.text,
    textAlign: 'center',
  },
  purchaseStateDescription: {
    ...typography.helper,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  confirmationContent: {
    gap: spacing.lg,
  },
  confirmationIntro: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  confirmationPlan: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
  },
  confirmationPlanDetails: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  confirmationPlanTitle: {
    ...typography.button,
    color: colors.text,
  },
  confirmationPlanPrice: {
    ...typography.button,
    color: colors.brand,
    textAlign: 'right',
  },
  confirmationTerms: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
