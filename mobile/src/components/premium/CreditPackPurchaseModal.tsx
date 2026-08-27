import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const purchase = useCreditPackPurchase(userId, enabled, visible, source, onBalanceUpdated);

  useEffect(() => {
    setSelectedPack((current) =>
      purchase.packs.some((pack) => pack.packageIdentifier === current?.packageIdentifier)
        ? current
        : (purchase.packs[0] ?? null),
    );
  }, [purchase.packs]);

  const unsupportedMessage =
    purchase.availability === 'web'
      ? 'AI credit packs are available in the iOS and Android apps.'
      : purchase.availability === 'expo_go'
        ? 'Use an installed development build to purchase AI credit packs.'
        : purchase.availability === 'misconfigured'
          ? 'Store billing is not configured in this build.'
          : null;

  return (
    <>
      <AppModal
        visible={visible && confirmationPack === null}
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
          {purchase.feedback ? <Text style={styles.feedback}>{purchase.feedback}</Text> : null}
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
        visible={confirmationPack !== null}
        title="Confirm Credit Pack"
        closeLabel="Back"
        onClose={() => {
          if (!purchase.pendingPackageIdentifier) setConfirmationPack(null);
        }}
      >
        {confirmationPack ? (
          <View style={styles.content}>
            <Text style={styles.confirmation}>
              Buy {confirmationPack.amount} AI planning{' '}
              {confirmationPack.amount === 1 ? 'credit' : 'credits'} for{' '}
              {confirmationPack.priceText}? This is a one-time purchase.
            </Text>
            <AppButton
              label={purchase.feedback ? 'Done' : 'Buy Credit Pack'}
              accessibilityLabel={
                purchase.feedback
                  ? 'Close credit pack purchase'
                  : `Buy ${confirmationPack.amount} AI credits for ${confirmationPack.priceText}`
              }
              loading={purchase.pendingPackageIdentifier === confirmationPack.packageIdentifier}
              loadingLabel="Completing purchase..."
              onPress={() =>
                purchase.feedback ? onClose() : void purchase.purchase(confirmationPack)
              }
            />
            {!purchase.feedback ? (
              <AppButton
                label="Cancel"
                variant="secondary"
                onPress={() => setConfirmationPack(null)}
                disabled={purchase.pendingPackageIdentifier !== null}
              />
            ) : null}
            {purchase.error ? <Text style={styles.error}>{purchase.error}</Text> : null}
            {purchase.feedback ? <Text style={styles.feedback}>{purchase.feedback}</Text> : null}
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
  error: {
    ...typography.helper,
    color: colors.dangerText,
  },
  feedback: {
    ...typography.helper,
    color: colors.brand,
  },
});
