import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LegalDocumentContent } from '../components/profile/LegalDocumentContent';
import { spacing } from '../design/tokens';
import { AppScreen } from '../components/ui/AppScreen';
import { IconButton } from '../components/ui/IconButton';
import { LEGAL_DOCUMENTS } from '../features/profile/legalDocuments';
import type { RootStackParamList } from '../navigation/navigationTypes';

type LegalDocumentScreenProps = {
  route: { params: RootStackParamList['LegalDocument'] };
  navigation: { goBack: () => void };
};

export function LegalDocumentScreen({ route, navigation }: LegalDocumentScreenProps) {
  const document = LEGAL_DOCUMENTS[route.params.documentId];
  const insets = useSafeAreaInsets();

  return (
    <AppScreen
      mode="scroll"
      edges={['right', 'left']}
      contentContainerStyle={[
        styles.screenContent,
        route.params.bottomInset ? { paddingBottom: spacing['3xl'] + insets.bottom } : null,
      ]}
    >
      <View style={styles.routeHeader}>
        <IconButton
          name="back"
          accessibilityLabel={`Back from ${document.title}`}
          onPress={navigation.goBack}
        />
      </View>
      <LegalDocumentContent document={document} />
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
