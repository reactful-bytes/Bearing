import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { IconButton } from '../ui/IconButton';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { PremiumFeature, getPremiumPaywallCopy } from '../../features/premium/premiumAccess';
import { usePremiumPurchase } from '../../features/premium/usePremiumPurchase';
import { PremiumPlan } from '../../features/premium/purchaseTypes';
import { recordTelemetryEvent } from '../../services/telemetry/telemetry';
import { LegalDocumentId } from '../../features/profile/legalDocuments';

type PremiumPaywallModalProps = {
  visible: boolean;
  feature: PremiumFeature | null;
  userId: string | null;
  isAnonymous: boolean;
  hasPremiumAccess: boolean;
  onClose: () => void;
  fullScreen?: boolean;
  screenPresentation?: boolean;
  onOpenLegalDocument: (documentId: LegalDocumentId) => void;
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
  fullScreen = false,
  screenPresentation = false,
  onOpenLegalDocument,
}: PremiumPaywallModalProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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

  const copy = getPremiumPaywallCopy();
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

  const paywallContent = (
    <ScrollView contentContainerStyle={styles.content}>
          <>
            <View style={styles.heroBlock}>
              <Text style={styles.badge}>{copy.badge}</Text>
              <Text style={styles.headline}>{copy.headline}</Text>
              <Text style={styles.body}>{copy.body}</Text>
            </View>

            <AppCard style={styles.highlightsCard}>
              <View style={styles.aiCardHeading}>
                <View style={styles.aiIcon}>
                  <Text style={styles.aiIconText}>AI</Text>
                </View>
                <View style={styles.aiCardHeadingCopy}>
                  <Text style={styles.aiCardEyebrow}>AI PLANNING</Text>
                  <Text style={styles.sectionTitle}>Turn goals into a plan</Text>
                </View>
              </View>
              <View style={styles.highlightList}>
                {copy.highlights.map((highlight) => (
                  <View key={highlight} style={styles.highlightRow}>
                    <View style={styles.highlightDot} />
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>
            </AppCard>

            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>CHOOSE YOUR PLAN</Text>
              {purchase.loading ? (
                <View style={styles.planColumn} accessibilityLabel="Loading subscription plans">
                  <View style={styles.skeletonPlanCard}>
                    <View style={styles.skeletonPlanCopy}>
                      <View style={styles.skeletonPlanTitle} />
                      <View style={styles.skeletonPlanMeta} />
                    </View>
                    <View style={styles.skeletonPlanPrice} />
                  </View>
                  <View style={styles.skeletonPlanCard}>
                    <View style={styles.skeletonPlanCopy}>
                      <View style={styles.skeletonPlanTitle} />
                      <View style={styles.skeletonPlanMeta} />
                    </View>
                    <View style={styles.skeletonPlanPrice} />
                  </View>
                </View>
              ) : (
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
                              <Text style={styles.planSummary}>
                                {plan.annualMonthlyBreakdownText}
                              </Text>
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
              )}
              <AppButton
                label="Continue"
                accessibilityLabel={
                  selectedPlan
                    ? `Continue with ${getBrandedPlanName(selectedPlan)} plan`
                    : 'Select a plan'
                }
                onPress={() => selectedPlan && setConfirmationPlan(selectedPlan)}
                disabled={isPurchaseDisabled}
                style={styles.primaryAction}
              />
            </View>

            <AppButton
              label="Continue on Free Plan"
              variant="secondary"
              accessibilityLabel="Close Bearing 360 plans"
              onPress={onClose}
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

            <View style={styles.divider} />
            <View style={styles.secondarySection}>
              <Text style={styles.sectionEyebrow}>ALREADY PURCHASED?</Text>
              <Text style={styles.secondaryDescription}>
                Restore access from an Apple or Google account already linked to Bearing 360.
              </Text>
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
            </View>

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

            <View style={styles.divider} />
            <View style={styles.secondarySection}>
              <Text style={styles.sectionEyebrow}>MORE INFORMATION</Text>
              <View style={styles.legalActions}>
                <AppButton
                  label="Privacy Policy"
                  variant="secondary"
                  accessibilityLabel="Open Privacy Policy"
                  onPress={() =>
                    onOpenLegalDocument('privacy')
                  }
                  style={styles.legalAction}
                />
                <AppButton
                  label="Terms of Service"
                  variant="secondary"
                  accessibilityLabel="Open Terms of Service"
                  onPress={() =>
                    onOpenLegalDocument('terms')
                  }
                  style={styles.legalAction}
                />
              </View>
            </View>
          </>
    </ScrollView>
  );

  return (
    <>
      {screenPresentation ? (
        paywallContent
      ) : (
        <AppModal
          visible={visible && confirmationPlan === null && transactionPlan === null}
          onClose={onClose}
          fullScreen={fullScreen}
          hideHeader={fullScreen}
        >
          {paywallContent}
        </AppModal>
      )}
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
        fullScreen={fullScreen}
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
                  <Text style={styles.planSummary}>{confirmationPlan.annualMonthlyBreakdownText}</Text>
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
              style={styles.primaryAction}
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
                    color={theme.colors.purple}
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
                    if (purchase.error) setTransactionPlan(null);
                    else onClose();
                  }}
                  style={[styles.primaryAction, styles.purchaseStateButton]}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </AppModal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.md,
    },
    routeHeader: {
      gap: spacing.sm,
    },
    heroBlock: {
      gap: spacing.sm,
    },
    badge: {
      ...typography.label,
      color: theme.colors.brand,
    },
    headline: {
      ...typography.sectionTitle,
      color: theme.colors.text,
    },
    body: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    highlightsCard: {
      gap: spacing.md,
      borderColor: theme.colors.purple,
      backgroundColor: theme.colors.surfacePurple,
    },
    aiCardHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    aiIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.purple,
    },
    aiIconText: {
      ...typography.label,
      color: theme.colors.onBrand,
      letterSpacing: 0,
    },
    aiCardHeadingCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    aiCardEyebrow: {
      ...typography.label,
      color: theme.colors.brand,
    },
    sectionTitle: {
      ...typography.cardTitle,
      color: theme.colors.text,
    },
    section: {
      gap: spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: spacing.sm,
    },
    sectionEyebrow: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    primaryAction: {
      backgroundColor: theme.colors.purple,
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
      backgroundColor: theme.colors.textPrimary,
      marginTop: 8,
    },
    highlightText: {
      ...typography.body,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    planColumn: {
      gap: spacing.md,
    },
    planCard: {
      minHeight: 56,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      padding: spacing.md,
    },
    planCardSelected: {
      borderColor: theme.colors.purple,
      backgroundColor: theme.colors.surfaceBrand,
    },
    planCardPressed: {
      opacity: 0.88,
    },
    skeletonPlanCard: {
      minHeight: 96,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      padding: spacing.md,
    },
    skeletonPlanCopy: {
      flex: 1,
      gap: spacing.sm,
    },
    skeletonPlanTitle: {
      width: '62%',
      height: 18,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.borderStrong,
    },
    skeletonPlanMeta: {
      width: '42%',
      height: 14,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.borderStrong,
    },
    skeletonPlanPrice: {
      width: '22%',
      height: 18,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.borderStrong,
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
      borderColor: theme.colors.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectionIndicatorSelected: {
      borderColor: theme.colors.purple,
    },
    selectionIndicatorFill: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.purple,
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
      color: theme.colors.text,
    },
    planSummary: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    planPrice: {
      ...typography.button,
      color: theme.colors.purple,
      textAlign: 'right',
    },
    planIntroductoryOffer: {
      ...typography.helper,
      color: theme.colors.brand,
    },
    planOfferBadge: {
      alignSelf: 'flex-start',
      borderRadius: radii.sm,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    planMeta: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    footnote: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    legalActions: {
      gap: spacing.sm,
      flexDirection: 'row',
    },
    legalAction: {
      flex: 1,
      paddingHorizontal: spacing.sm,
    },
    secondarySection: {
      gap: spacing.sm,
    },
    secondaryDescription: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    accountNote: {
      ...typography.helper,
      color: theme.colors.brand,
      lineHeight: 20,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    purchaseState: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    purchaseStateButton: {
      alignSelf: 'stretch',
    },
    transactionContent: {
      gap: spacing.md,
    },
    transactionPlan: {
      gap: spacing.xs,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfacePurple,
      borderWidth: 1,
      borderColor: theme.colors.purple,
      padding: spacing.md,
    },
    transactionPlanLabel: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    transactionPlanRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    transactionPlanTitle: {
      ...typography.button,
      color: theme.colors.text,
      flex: 1,
    },
    transactionPlanPrice: {
      ...typography.button,
      color: theme.colors.purple,
    },
    progressIndicator: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfacePurple,
    },
    resultMark: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultMarkSuccess: {
      backgroundColor: theme.colors.surfacePurple,
    },
    resultMarkFailure: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    resultMarkText: {
      ...typography.title,
      color: theme.colors.purple,
    },
    purchaseStateTitle: {
      ...typography.button,
      color: theme.colors.text,
      textAlign: 'center',
    },
    purchaseStateDescription: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    confirmationContent: {
      gap: spacing.lg,
    },
    confirmationIntro: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    confirmationPlan: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfacePurple,
      borderWidth: 1,
      borderColor: theme.colors.purple,
      padding: spacing.lg,
    },
    confirmationPlanDetails: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    confirmationPlanTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    confirmationPlanPrice: {
      ...typography.button,
      color: theme.colors.purple,
      textAlign: 'right',
    },
    confirmationTerms: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
  });
