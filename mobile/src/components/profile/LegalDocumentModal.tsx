import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { LegalDocument } from '../../features/profile/legalDocuments';
import { AppModal } from '../ui/AppModal';

type LegalDocumentModalProps = {
  document: LegalDocument | null;
  onClose: () => void;
};

export function LegalDocumentModal({ document, onClose }: LegalDocumentModalProps) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.xl,
    },
    effectiveDate: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    notice: {
      ...typography.body,
      color: theme.colors.dangerText,
    },
    section: {
      gap: spacing.sm,
    },
    heading: {
      ...typography.button,
      color: theme.colors.text,
    },
    body: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
  });
