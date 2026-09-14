import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { LegalDocument } from '../../features/profile/legalDocuments';
import { useThemedStyles } from '../../design/useThemedStyles';
import { SectionHeading } from '../ui/SectionHeading';

type LegalDocumentContentProps = {
  document: LegalDocument;
};

export function LegalDocumentContent({ document }: LegalDocumentContentProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.content}>
      <SectionHeading title={document.title} variant="uppercase-accent" />
      <View style={styles.sectionContent}>
        <Text style={styles.effectiveDate}>Effective {document.effectiveDate}</Text>
        <Text style={styles.notice}>{document.notice}</Text>
        <Text style={styles.body}>{document.introduction}</Text>
        {document.sections.map((section) => (
          <View key={section.heading} style={styles.subsection}>
            <Text accessibilityRole="header" style={styles.heading}>
              {section.heading}
            </Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    sectionContent: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    effectiveDate: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    notice: {
      ...typography.body,
      color: theme.colors.dangerText,
    },
    subsection: {
      gap: spacing.md,
    },
    heading: {
      ...typography.cardTitle,
      color: theme.colors.text,
    },
    body: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
  });
