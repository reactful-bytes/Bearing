import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { formatSummaryDate } from '../../dateFormatting';
import { spacing, typography } from '../../design/tokens';
import type { AppIconName } from '../../design/icons';
import { NoteRecord } from '../../features/notes/noteTypes';
import { AppIcon } from '../ui/AppIcon';
import { NoteLabelChips } from './NoteLabels';

type NoteReadOnlyDetailsProps = {
  note: NoteRecord;
  locale?: string;
  trailing?: ReactNode;
};

type NoteDetailSectionProps = {
  icon: AppIconName;
  title: string;
  children: ReactNode;
  fullWidthContent?: boolean;
  testID?: string;
};

function formatDate(date: Date, locale?: string): string {
  return formatSummaryDate(date, locale);
}

export function NoteReadOnlyDetails({ note, locale, trailing }: NoteReadOnlyDetailsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroTopline}>
          <View style={styles.noteIconFrame}>
            <AppIcon name="note" size={20} color={styles.noteIcon.color} decorative />
          </View>
          <View style={styles.heroHeading}>
            <Text style={styles.eyebrow}>NOTE</Text>
            <View style={styles.heroMetadata}>
              <AppIcon name="date" size={14} color={styles.metadataIcon.color} decorative />
              <Text style={styles.metadataText}>
                Updated {formatDate(note.updatedAt, locale)} · Created{' '}
                {formatDate(note.createdAt, locale)}
              </Text>
            </View>
          </View>
          <View style={styles.heroTrailing}>{trailing}</View>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {note.title}
        </Text>
        <Text style={styles.body}>{note.body}</Text>
      </View>

      {note.labels.length > 0 ? (
        <NoteDetailSection icon="tags" title="LABELS">
          <NoteLabelChips labels={note.labels} />
        </NoteDetailSection>
      ) : null}
    </>
  );
}

export function NoteDetailSection({
  icon,
  title,
  children,
  fullWidthContent = false,
  testID,
}: NoteDetailSectionProps) {
  const styles = useThemedStyles(createStyles);

  if (fullWidthContent) {
    return (
      <View testID={testID} style={[styles.section, styles.fullWidthSection]}>
        <View testID={testID ? `${testID}-header` : undefined} style={styles.fullWidthHeader}>
          <View style={styles.sectionIconFrame}>
            <AppIcon name={icon} size={17} color={styles.sectionIcon.color} decorative />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.fullWidthCopy}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionIconFrame}>
        <AppIcon name={icon} size={17} color={styles.sectionIcon.color} decorative />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    heroTopline: { minHeight: 40, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    noteIconFrame: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    noteIcon: { color: theme.colors.brand },
    heroHeading: { flex: 1, minWidth: 0, gap: spacing.xs },
    eyebrow: { ...typography.caption, color: theme.colors.brand, fontWeight: '700' },
    heroTrailing: { marginLeft: 'auto' },
    heroMetadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    metadataIcon: { color: theme.colors.textSecondary },
    metadataText: { ...typography.caption, color: theme.colors.textSecondary, flex: 1 },
    title: { ...typography.sectionTitle, color: theme.colors.text },
    body: { ...typography.body, color: theme.colors.textPrimary },
    section: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    fullWidthSection: { flexDirection: 'column', gap: spacing.md },
    fullWidthHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sectionIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    sectionIcon: { color: theme.colors.brand },
    sectionCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    fullWidthCopy: { alignSelf: 'stretch', gap: spacing.md },
    sectionTitle: { ...typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
  });
