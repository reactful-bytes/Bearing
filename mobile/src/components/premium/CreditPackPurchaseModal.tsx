import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
import { useCreditPackPurchase } from '../../features/premium/useCreditPackPurchase';
import { CreditPack, CreditPackSource } from '../../features/premium/purchaseTypes';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';

type CreditPackPurchaseModalProps = {
  visible: boolean;
  userId: string | null;
  enabled: boolean;
  source: CreditPackSource;
  currentBalance: number | null;
  onBalanceUpdated: (availableCredits: number) => void;
  onClose: () => void;
};

export function CreditPackPurchaseModal({
  visible,
  userId,
  enabled,
  source,
  currentBalance,
  onBalanceUpdated,
  onClose,
}: CreditPackPurchaseModalProps) {
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

  return (
    <>
      <AppModal
        visible={visible && confirmationPack === null && transactionPack === null}
        title="Get AI Credits"
        onClose={onClose}
      >
        <View style={styles.content}>
          {currentBalance !== null ? (
            <Text style={styles.balance}>{currentBalance} AI planning credits available</Text>
          ) : null}
          {purchase.loading ? <Text style={styles.meta}>Loading credit packs...</Text> : null}
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
            disabled={!selectedPack || purchase.availability !== 'available'}
          />
        </View>
      </AppModal>
      <AppModal
        visible={confirmationPack !== null || transactionPack !== null}
        title={transactionPack ? (isPurchaseInProgress ? 'Completing Purchase' : 'Credit Pack Update') : 'Confirm Credit Pack'}
        closeLabel={transactionPack ? 'Close' : 'Back'}
        onClose={() => {
          if (transactionPack) {
            if (!isPurchaseInProgress) setTransactionPack(null);
          } else if (!purchase.pendingPackageIdentifier) {
            setConfirmationPack(null);
          }
        }}
      >
        {confirmationPack ? (
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
            />
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => setConfirmationPack(null)}
              disabled={purchase.pendingPackageIdentifier !== null}
            />
          </View>
        ) : null}
        {transactionPack ? (
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
                  color={colors.brand}
                  size="large"
                />
                <Text style={styles.purchaseStateTitle}>Confirming purchase</Text>
                <Text style={styles.purchaseStateDescription}>
                  Completing your AI credit pack purchase. This can take a moment.
                </Text>
              </View>
            ) : isPurchaseComplete ? (
              <View style={styles.purchaseState}>
                <View
                  style={[styles.resultMark, purchase.error && styles.resultMarkFailure]}
                >
                  <Text style={styles.resultMarkText}>{purchase.error ? '!' : '✓'}</Text>
                </View>
                <Text style={styles.purchaseStateTitle}>
                  {purchase.error ? 'Purchase not completed' : 'AI credits added'}
                </Text>
                <Text style={purchase.error ? styles.error : styles.feedback}>
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
  },
  balance: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pack: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  packSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceBrand,
  },
  packAmount: {
    ...typography.button,
    color: colors.text,
    flex: 1,
  },
  packPrice: {
    ...typography.button,
    color: colors.brand,
  },
  meta: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  confirmation: {
    ...typography.body,
    color: colors.textPrimary,
  },
  confirmationContent: {
    gap: spacing.lg,
  },
  confirmationIntro: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  confirmationPack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
  },
  confirmationPackDetails: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  confirmationPackTitle: {
    ...typography.button,
    color: colors.text,
  },
  confirmationPackMeta: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  confirmationPackPrice: {
    ...typography.button,
    color: colors.brand,
    textAlign: 'right',
  },
  confirmationTerms: {
    ...typography.body,
    color: colors.textPrimary,
  },
  error: {
    ...typography.helper,
    color: colors.dangerText,
  },
  feedback: {
    ...typography.helper,
    color: colors.brand,
  },
  transactionPack: {
    gap: spacing.xs,
  },
  transactionPackLabel: {
    ...typography.helper,
    color: colors.textSecondary,
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
  resultMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBrand,
  },
  resultMarkFailure: {
    backgroundColor: colors.dangerSurface,
  },
  resultMarkText: {
    ...typography.screenTitle,
    color: colors.brand,
  },
});
