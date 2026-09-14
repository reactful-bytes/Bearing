import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useCreditPackPurchase } from '../../features/premium/useCreditPackPurchase';
import { CreditPack, CreditPackSource } from '../../features/premium/purchaseTypes';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { AppModal } from '../ui/AppModal';

type CreditPackPurchaseModalProps = {
  visible: boolean;
  embedded?: boolean;
  userId: string | null;
  enabled: boolean;
  source: CreditPackSource;
  currentBalance: number | null;
  onBalanceUpdated: (availableCredits: number) => void;
  onClose: () => void;
};

export function CreditPackPurchaseModal({
  visible,
  embedded = false,
  userId,
  enabled,
  source,
  currentBalance,
  onBalanceUpdated,
  onClose,
}: CreditPackPurchaseModalProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [confirmationPack, setConfirmationPack] = useState<CreditPack | null>(null);
  const [transactionPack, setTransactionPack] = useState<CreditPack | null>(null);
  const purchase = useCreditPackPurchase(userId, enabled, visible, source, onBalanceUpdated);

  useEffect(() => {
    setSelectedPack((current) =>
      purchase.packs.some((pack) => pack.packageIdentifier === current?.packageIdentifier)
        ? current
        : (purchase.packs[0] ?? null),
    );
  }, [purchase.packs]);

  useEffect(() => {
    if (!visible) {
      setConfirmationPack(null);
      setTransactionPack(null);
    }
  }, [visible]);

  const unsupportedMessage =
    purchase.availability === 'web'
      ? 'AI credit packs are available in the iOS and Android apps.'
      : purchase.availability === 'expo_go'
        ? 'Use an installed development build to purchase AI credit packs.'
        : purchase.availability === 'misconfigured'
          ? 'Store billing is not configured in this build.'
          : null;

  async function confirmPurchase(): Promise<void> {
    if (!confirmationPack) return;
    setTransactionPack(confirmationPack);
    setConfirmationPack(null);
    await purchase.purchase(confirmationPack);
  }

  const isPurchaseInProgress =
    transactionPack !== null &&
    purchase.pendingPackageIdentifier === transactionPack.packageIdentifier;
  const isPurchaseComplete =
    transactionPack !== null && (purchase.feedback !== null || purchase.error !== null);

  const selectionContent = (
    <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroBlock}>
            <Text style={styles.badge}>AI PLANNING</Text>
            <Text style={styles.headline}>Keep your planning momentum</Text>
            <Text style={styles.body}>
              Add AI planning credits when you want more help turning goals into editable milestones
              and next steps.
            </Text>
          </View>

          <AppCard style={styles.aiCard}>
            <View style={styles.aiCardHeading}>
              <View style={styles.aiIcon}>
                <Text style={styles.aiIconText}>AI</Text>
              </View>
              <View style={styles.aiCardHeadingCopy}>
                <Text style={styles.aiCardEyebrow}>CREDIT PACKS</Text>
                <Text style={styles.sectionTitle}>One-time AI planning credits</Text>
              </View>
            </View>
            {currentBalance !== null ? (
              <Text style={styles.balance}>{currentBalance} AI planning credits available</Text>
            ) : null}
          </AppCard>

          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>CHOOSE A CREDIT PACK</Text>
            {purchase.loading ? (
              <View style={styles.skeletonColumn} accessibilityLabel="Loading credit packs">
                <View style={styles.skeletonPack}>
                  <View style={styles.skeletonPrimaryLine} />
                  <View style={styles.skeletonPriceLine} />
                </View>
                <View style={styles.skeletonPack}>
                  <View style={styles.skeletonPrimaryLine} />
                  <View style={styles.skeletonPriceLine} />
                </View>
              </View>
            ) : (
              <View style={styles.packColumn}>
                {purchase.packs.map((pack) => {
                  const selected = pack.packageIdentifier === selectedPack?.packageIdentifier;
                  return (
                    <Pressable
                      key={pack.packageIdentifier}
                      accessibilityRole="radio"
                      accessibilityLabel={`Select ${pack.amount} AI credit pack for ${pack.priceText}`}
                      accessibilityState={{
                        selected,
                        disabled: purchase.pendingPackageIdentifier !== null,
                      }}
                      disabled={purchase.pendingPackageIdentifier !== null}
                      onPress={() => setSelectedPack(pack)}
                      style={[styles.pack, selected && styles.packSelected]}
                    >
                      <Text style={styles.packAmount}>
                        {pack.amount} AI planning {pack.amount === 1 ? 'credit' : 'credits'}
                      </Text>
                      <Text style={styles.packPrice}>{pack.priceText}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {unsupportedMessage ? <Text style={styles.meta}>{unsupportedMessage}</Text> : null}
            {purchase.error ? <Text style={styles.error}>{purchase.error}</Text> : null}
            <AppButton
              label="Continue"
              accessibilityLabel={
                selectedPack
                  ? `Continue with ${selectedPack.amount} AI credits`
                  : 'Select a credit pack'
              }
              onPress={() => selectedPack && setConfirmationPack(selectedPack)}
              disabled={purchase.loading || !selectedPack || purchase.availability !== 'available'}
              style={styles.primaryAction}
            />
          </View>
    </ScrollView>
  );

  const confirmationContent = confirmationPack ? (
    <View style={styles.confirmationContent}>
      <Text style={styles.confirmationIntro}>You are selecting</Text>
      <View style={styles.confirmationPack}>
        <View style={styles.confirmationPackDetails}>
          <Text style={styles.confirmationPackTitle}>
            {confirmationPack.amount} AI planning{' '}
            {confirmationPack.amount === 1 ? 'credit' : 'credits'}
          </Text>
          <Text style={styles.confirmationPackMeta}>One-time credit pack</Text>
        </View>
        <Text style={styles.confirmationPackPrice}>{confirmationPack.priceText}</Text>
      </View>
      <Text style={styles.confirmationTerms}>
        This is a one-time purchase and does not renew automatically.
      </Text>
      <AppButton
        label="Continue to Store"
        accessibilityLabel={`Continue to the store for ${confirmationPack.amount} AI credits`}
        loading={purchase.pendingPackageIdentifier === confirmationPack.packageIdentifier}
        loadingLabel="Opening store..."
        onPress={() => void confirmPurchase()}
        style={styles.primaryAction}
      />
      <AppButton
        label="Cancel"
        variant="secondary"
        onPress={() => setConfirmationPack(null)}
        disabled={purchase.pendingPackageIdentifier !== null}
      />
    </View>
  ) : null;

  const transactionContent = transactionPack ? (
    <View style={styles.content}>
      <View style={styles.transactionPack}>
        <Text style={styles.transactionPackLabel}>Selected credit pack</Text>
        <View style={styles.transactionPackRow}>
          <Text style={styles.packAmount}>
            {transactionPack.amount} AI planning{' '}
            {transactionPack.amount === 1 ? 'credit' : 'credits'}
          </Text>
          <Text style={styles.packPrice}>{transactionPack.priceText}</Text>
        </View>
      </View>
      {isPurchaseInProgress ? (
        <View style={styles.purchaseState}>
          <ActivityIndicator
            accessibilityLabel="Completing credit pack purchase"
            color={theme.colors.purple}
            size="large"
          />
          <Text style={styles.purchaseStateTitle}>Confirming purchase</Text>
          <Text style={styles.purchaseStateDescription}>
            Completing your AI credit pack purchase. This can take a moment.
          </Text>
        </View>
      ) : isPurchaseComplete ? (
        <View style={styles.purchaseState}>
          <View style={[styles.resultMark, purchase.error && styles.resultMarkFailure]}>
            <Text style={styles.resultMarkText}>{purchase.error ? '!' : '✓'}</Text>
          </View>
          <Text style={styles.purchaseStateTitle}>
            {purchase.error ? 'Purchase not completed' : 'AI credits added'}
          </Text>
          <Text style={styles.purchaseStateDescription}>
            {purchase.error ?? purchase.feedback}
          </Text>
          <AppButton
            label={purchase.error ? 'Choose Another Pack' : 'Done'}
            accessibilityLabel={
              purchase.error ? 'Choose another credit pack' : 'Close credit pack purchase'
            }
            onPress={() => {
              setTransactionPack(null);
              if (!purchase.error) onClose();
            }}
            style={[styles.primaryAction, styles.purchaseStateButton]}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  const selectionVisible = visible && confirmationPack === null && transactionPack === null;
  const followUpVisible = confirmationPack !== null || transactionPack !== null;

  return (
    <>
      {embedded ? (
        visible && selectionVisible ? <View>{selectionContent}</View> : null
      ) : (
        <AppModal visible={selectionVisible} fullScreen closeLabel="Back" onClose={onClose}>
          {selectionContent}
        </AppModal>
      )}
      <AppModal
        visible={!embedded && followUpVisible}
        title={
          transactionPack
            ? isPurchaseInProgress
              ? 'Completing Purchase'
              : 'Credit Pack Update'
            : 'Confirm Credit Pack'
        }
        closeLabel={transactionPack ? 'Close' : 'Back'}
        fullScreen
        onClose={() => {
          if (transactionPack) {
            if (!isPurchaseInProgress) setTransactionPack(null);
          } else if (!purchase.pendingPackageIdentifier) {
            setConfirmationPack(null);
          }
        }}
      >
        {confirmationContent}
        {transactionContent}
      </AppModal>
      {embedded && visible && followUpVisible ? (
        <View style={styles.embeddedFollowUp}>
          {confirmationContent}
          {transactionContent}
        </View>
      ) : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.md,
      paddingBottom: spacing['3xl'],
    },
    embeddedFollowUp: {
      gap: spacing.lg,
      paddingBottom: spacing['3xl'],
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
    aiCard: {
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
    sectionEyebrow: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: spacing.sm,
    },
    packColumn: {
      gap: spacing.md,
    },
    skeletonColumn: {
      gap: spacing.md,
    },
    skeletonPack: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonPrimaryLine: {
      width: '55%',
      height: 16,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.borderStrong,
    },
    skeletonPriceLine: {
      width: '20%',
      height: 16,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.borderStrong,
    },
    primaryAction: {
      backgroundColor: theme.colors.purple,
    },
    balance: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    pack: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    packSelected: {
      borderColor: theme.colors.purple,
      backgroundColor: theme.colors.surfacePurple,
    },
    packAmount: {
      ...typography.button,
      color: theme.colors.text,
      flex: 1,
    },
    packPrice: {
      ...typography.button,
      color: theme.colors.purple,
    },
    meta: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    confirmation: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    confirmationContent: {
      gap: spacing.lg,
    },
    confirmationIntro: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    confirmationPack: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfacePurple,
      borderWidth: 1,
      borderColor: theme.colors.purple,
      padding: spacing.lg,
    },
    confirmationPackDetails: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    confirmationPackTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    confirmationPackMeta: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    confirmationPackPrice: {
      ...typography.button,
      color: theme.colors.purple,
      textAlign: 'right',
    },
    confirmationTerms: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    error: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    feedback: {
      ...typography.helper,
      color: theme.colors.brand,
    },
    transactionPack: {
      gap: spacing.xs,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfacePurple,
      borderWidth: 1,
      borderColor: theme.colors.purple,
      padding: spacing.md,
    },
    transactionPackLabel: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    transactionPackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    purchaseState: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    purchaseStateButton: {
      alignSelf: 'stretch',
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
    resultMark: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfacePurple,
    },
    resultMarkFailure: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    resultMarkText: {
      ...typography.screenTitle,
      color: theme.colors.purple,
    },
  });
