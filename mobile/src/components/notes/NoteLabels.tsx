import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { normalizeNoteLabels } from '../../features/notes/noteLabels';
import { radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';

type NoteLabelChipsProps = {
  labels: string[];
  onRemove?: (label: string) => void;
};

type NoteLabelsFieldProps = {
  labels: string[];
  onChange: (labels: string[]) => void;
};

export function NoteLabelChips({ labels = [], onRemove }: NoteLabelChipsProps) {
  const styles = useThemedStyles(createStyles);

  if (labels.length === 0) return null;

  return (
    <View style={styles.chipList}>
      {labels.map((label) =>
        onRemove ? (
          <Pressable
            key={label.toLowerCase()}
            accessibilityRole="button"
            accessibilityLabel={`Remove label ${label}`}
            onPress={() => onRemove(label)}
            style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
          >
            <Text style={styles.chipText}>{label}</Text>
            <AppIcon name="close" size={14} color={styles.chipIcon.color} decorative />
          </Pressable>
        ) : (
          <View key={label.toLowerCase()} style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function NoteLabelsField({ labels, onChange }: NoteLabelsFieldProps) {
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState('');

  function addLabel(): void {
    const candidate = draft.trim();
    if (!candidate) return;

    onChange(normalizeNoteLabels([...labels, candidate]));
    setDraft('');
  }

  function removeLabel(labelToRemove: string): void {
    onChange(labels.filter((label) => label.toLowerCase() !== labelToRemove.toLowerCase()));
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Labels</Text>
      <NoteLabelChips labels={labels} onRemove={removeLabel} />
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="New note label"
          autoCapitalize="sentences"
          onChangeText={setDraft}
          onSubmitEditing={addLabel}
          placeholder="Add a label"
          placeholderTextColor={styles.placeholder.color}
          returnKeyType="done"
          style={styles.input}
          value={draft}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add note label"
          disabled={!draft.trim()}
          onPress={addLabel}
          style={({ pressed }) => [
            styles.addButton,
            !draft.trim() ? styles.disabled : null,
            pressed ? styles.chipPressed : null,
          ]}
        >
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: { gap: spacing.sm },
    fieldLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    chipText: { ...typography.helper, color: theme.colors.textPrimary },
    chipIcon: { color: theme.colors.textSecondary },
    chipPressed: { opacity: 0.7 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    input: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: spacing.md,
      ...typography.body,
    },
    placeholder: { color: theme.colors.textMuted },
    addButton: {
      minHeight: 44,
      minWidth: 56,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceBrand,
    },
    addText: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    disabled: { opacity: 0.45 },
  });
