import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';
import { LegalDocument } from '../../features/profile/legalDocuments';
import { AppModal } from '../ui/AppModal';

type LegalDocumentModalProps = {
  document: LegalDocument | null;
  onClose: () => void;
};

export function LegalDocumentModal({ document, onClose }: LegalDocumentModalProps) {
  return (
    <AppModal visible={document !== null} title={document?.title ?? 'Legal'} onClose={onClose}>
      {document ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.effectiveDate}>Effective {document.effectiveDate}</Text>
          <Text style={styles.notice}>{document.notice}</Text>
          <Text style={styles.body}>{document.introduction}</Text>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                {section.heading}
              </Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  effectiveDate: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  notice: {
    ...typography.body,
    color: colors.dangerText,
  },
  section: {
    gap: spacing.sm,
  },
  heading: {
    ...typography.button,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
