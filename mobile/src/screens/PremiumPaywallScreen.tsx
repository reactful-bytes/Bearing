import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { spacing } from '../design/tokens';
import { AppScreen } from '../components/ui/AppScreen';
import { IconButton } from '../components/ui/IconButton';
import { useUserProfile } from '../features/profile/useUserProfile';
import { hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import type { RootStackParamList } from '../navigation/navigationTypes';

type PremiumPaywallScreenProps = {
  route: { params: RootStackParamList['PremiumPaywall'] };
  navigation: {
    goBack: () => void;
    navigate: (screen: 'LegalDocument', params: RootStackParamList['LegalDocument']) => void;
  };
};

export function PremiumPaywallScreen({ route, navigation }: PremiumPaywallScreenProps) {
  const { authUser, isAnonymous } = useUserProfile();
  const { entitlement } = usePremiumEntitlement(authUser?.uid ?? null);
  const insets = useSafeAreaInsets();
  const hasSystemBottomInset = route.params.source === 'ai_goal_builder';

  return (
    <AppScreen
      mode="scroll"
      edges={['right', 'left']}
      contentContainerStyle={[
        styles.screenContent,
        hasSystemBottomInset ? { paddingBottom: spacing['3xl'] + insets.bottom } : null,
      ]}
    >
      <View style={styles.routeHeader}>
        <IconButton
          name="back"
          accessibilityLabel="Close Bearing 360 plans"
          onPress={navigation.goBack}
        />
      </View>
      <PremiumPaywallModal
        visible
        feature={route.params.feature}
        userId={authUser?.uid ?? null}
        isAnonymous={isAnonymous}
        hasPremiumAccess={hasActivePremiumStatus(entitlement?.status)}
        onClose={navigation.goBack}
        fullScreen
        screenPresentation
        onOpenLegalDocument={(documentId) =>
          navigation.navigate('LegalDocument', {
            documentId,
            bottomInset: route.params.source === 'ai_goal_builder',
          })
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
  },
  routeHeader: {
    gap: spacing.sm,
  },
});
